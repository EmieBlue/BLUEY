/**
 * End-to-end smoke test of Bluy's Supabase backend, using the SAME anon key the
 * app uses (read from `.env`).
 *
 * It mirrors the real app flow:
 *   - sign up           -> src/context/auth.tsx  signUp()
 *   - load profile      -> src/context/app-state.tsx  loadFromCloud()
 *   - follow / progress -> src/context/app-state.tsx  toggleFollow() / setProgress()
 *   - sign in again     -> src/context/auth.tsx  signIn()
 *
 * "Confirm email" can stay ON (production-like): if a database connection string
 * is available (SUPABASE_DB_URL in `.env.seed` or the environment, same as
 * scripts/run-sql.mjs), the script confirms the test user's email directly so it
 * can log in, runs the logged-in checks, then fully deletes the test user.
 *
 * Usage:  node scripts/verify-supabase.mjs
 */
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// --- tiny env reader: looks in the given file, then process.env ------------
function readFrom(file, name) {
  try {
    const raw = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`));
      if (m) return m[1].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // file not present; fall through
  }
  return undefined;
}
const readEnv = (name) => readFrom('../.env', name) ?? process.env[name];
// DB connection string lives in .env.seed (gitignored), like run-sql.mjs.
const dbUrl = readFrom('../.env.seed', 'SUPABASE_DB_URL') ?? process.env.SUPABASE_DB_URL;

const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!url || !anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Run one function with a short-lived Postgres connection (same SSL as run-sql.mjs).
const { Client } = pg;
async function withDb(fn) {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// --- result tracking -------------------------------------------------------
const results = [];
function pass(step, detail = '') {
  results.push({ step, ok: true, detail });
  console.log(`  PASS  ${step}${detail ? ` — ${detail}` : ''}`);
}
function fail(step, detail = '') {
  results.push({ step, ok: false, detail });
  console.log(`  FAIL  ${step}${detail ? ` — ${detail}` : ''}`);
}

// --- test fixtures ---------------------------------------------------------
const stamp = Date.now();
const email = `bluy-test+${stamp}@gmail.com`;
const password = `Test-${stamp}-pw!`;
const displayName = 'Bluy Test';
const storyId = `verify-story-${stamp}`;
const chapterId = `verify-chapter-${stamp}`;

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nVerifying Supabase project: ${url}`);
console.log(`Test account: ${email}\n`);

let userId = null;
let hasSession = false;

// 1) SIGN UP ----------------------------------------------------------------
{
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    fail('Sign up', error.message);
  } else if (data.user && !data.session) {
    // Matches auth.tsx: user created, but must confirm email first.
    hasSession = false;
    userId = data.user.id;
    pass('Sign up', 'account created (BUT "Confirm email" is ON — no session yet)');
  } else if (data.session) {
    hasSession = true;
    userId = data.user?.id ?? null;
    pass('Sign up', 'account created AND signed in (Confirm email is OFF)');
  } else {
    fail('Sign up', 'unexpected response (no user, no session)');
  }
}

// 1b) "Confirm email" is ON -> mark the test user confirmed via the DB, so we
//     can log in and exercise the logged-in (RLS-protected) paths.
if (!hasSession && userId && dbUrl) {
  try {
    await withDb((client) =>
      client.query(
        `update auth.users set email_confirmed_at = now()
         where id = $1 and email_confirmed_at is null`,
        [userId],
      ),
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      fail('Confirm email (via DB) + sign in', error.message);
    } else if (data.session) {
      hasSession = true;
      pass('Confirm email (via DB) + sign in', 'email marked confirmed, login works');
    } else {
      fail('Confirm email (via DB) + sign in', 'no session after confirming');
    }
  } catch (e) {
    fail('Confirm email (via DB)', e.message);
  }
}

// The remaining cloud checks need an active session (RLS uses auth.uid()).
if (hasSession && userId) {
  // 2) PROFILE ROW (signup trigger + is_author column) ----------------------
  {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, is_subscribed, is_author')
      .eq('id', userId)
      .maybeSingle();
    if (error) fail('Profile row created by trigger', error.message);
    else if (!data) fail('Profile row created by trigger', 'no profiles row found for new user');
    else
      pass(
        'Profile row created by trigger',
        `display_name=${JSON.stringify(data.display_name)}, is_subscribed=${data.is_subscribed}, is_author=${data.is_author}`,
      );
  }

  // 3) FOLLOWS write + read back (RLS own-rows) -----------------------------
  {
    const ins = await supabase.from('follows').insert({ user_id: userId, story_id: storyId });
    if (ins.error) {
      fail('Follow write', ins.error.message);
    } else {
      const sel = await supabase
        .from('follows')
        .select('story_id')
        .eq('user_id', userId)
        .eq('story_id', storyId);
      if (sel.error) fail('Follow read-back', sel.error.message);
      else if ((sel.data ?? []).length === 1) pass('Follow write + read-back');
      else fail('Follow read-back', `expected 1 row, got ${(sel.data ?? []).length}`);
    }
  }

  // 4) READING PROGRESS upsert + read back ----------------------------------
  {
    const up = await supabase
      .from('reading_progress')
      .upsert(
        { user_id: userId, story_id: storyId, chapter_id: chapterId },
        { onConflict: 'user_id,story_id' },
      );
    if (up.error) {
      fail('Progress write', up.error.message);
    } else {
      const sel = await supabase
        .from('reading_progress')
        .select('chapter_id')
        .eq('user_id', userId)
        .eq('story_id', storyId)
        .maybeSingle();
      if (sel.error) fail('Progress read-back', sel.error.message);
      else if (sel.data?.chapter_id === chapterId) pass('Progress write + read-back');
      else fail('Progress read-back', `got ${JSON.stringify(sel.data?.chapter_id)}`);
    }
  }

  // 5) SIGN OUT + SIGN BACK IN ----------------------------------------------
  {
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail('Sign out + sign back in', error.message);
    else if (data.session) pass('Sign out + sign back in', 'returning login works');
    else fail('Sign out + sign back in', 'no session returned');
  }

  // tidy: clean up the rows we created (so re-runs stay clean even if user delete fails).
  await supabase.from('follows').delete().eq('user_id', userId).eq('story_id', storyId);
  await supabase.from('reading_progress').delete().eq('user_id', userId).eq('story_id', storyId);
} else if (!dbUrl) {
  console.log(
    '\n  (Skipping logged-in checks: no session, and no SUPABASE_DB_URL to confirm the email.)\n' +
      '  Add the database connection string to .env.seed to finish the test:\n' +
      '    SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@...pooler.supabase.com:5432/postgres\n' +
      '  (Supabase dashboard → Project Settings → Database → Connection string.)',
  );
}

// Full cleanup: delete the test auth user (cascades to profiles/follows/progress).
let cleaned = false;
if (userId && dbUrl) {
  try {
    await withDb((client) => client.query(`delete from auth.users where id = $1`, [userId]));
    cleaned = true;
  } catch (e) {
    console.log(`\n  (Could not auto-delete test user: ${e.message})`);
  }
}

// --- summary ---------------------------------------------------------------
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${'='.repeat(60)}`);
console.log(`Result: ${results.length - failed}/${results.length} checks passed.`);
console.log('='.repeat(60));
console.log(
  cleaned
    ? `Cleanup: test user ${email} deleted.`
    : `Leftover test user to delete in dashboard (Authentication → Users): ${email}`,
);
console.log('');

// Set the code but let Node drain its own handles (avoids a Windows libuv
// assertion that can fire when process.exit() races open TLS sockets).
process.exitCode = failed > 0 ? 1 : 0;
