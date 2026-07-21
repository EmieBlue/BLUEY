/**
 * End-to-end test of the Paystack "buy a book" flow against the DEPLOYED Netlify
 * Functions. Works in TEST mode (no real money) once the PAYSTACK_* env vars are
 * set on Netlify and the site is deployed.
 *
 * It proves our code paths:
 *   - create-checkout    -> returns a Paystack checkout URL (secret key + amount valid)
 *   - paystack-webhook    -> a signed `charge.success` with metadata {userId, storyId}
 *                            records a row in `purchases` (this reader now owns the book)
 *   - paystack-webhook    -> a forged signature is rejected with 401
 *
 * It seeds a throwaway story directly in Postgres (bypassing RLS) and borrows an
 * existing account id as the buyer, so the purchase's foreign keys resolve, then
 * removes the story + transient purchase again — it leaves no trace. (Borrowing
 * an account avoids Supabase's hourly signup email limit.)
 *
 * Reads the DB string from `.env.seed` and the Paystack secret key from the
 * environment (so it never touches a file). The key MUST match the
 * PAYSTACK_SECRET_KEY set on Netlify, or the webhook signature check will
 * (correctly) reject it:
 *
 *   PAYSTACK_SECRET_KEY=sk_test_... node scripts/verify-paystack.mjs
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

import pg from 'pg';

function readFrom(file, name) {
  try {
    const raw = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`));
      if (m) return m[1].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* missing file */
  }
  return undefined;
}
const dbUrl = readFrom('../.env.seed', 'SUPABASE_DB_URL') ?? process.env.SUPABASE_DB_URL;
const paystackKey = process.env.PAYSTACK_SECRET_KEY;
const site = (process.env.SITE_URL || 'https://bluy-4az69d.netlify.app').replace(/\/$/, '');

for (const [k, v] of Object.entries({ dbUrl, paystackKey })) {
  if (!v) {
    console.error(`Missing ${k}. (PAYSTACK_SECRET_KEY is passed via env; see header.)`);
    process.exit(1);
  }
}

async function withDb(fn) {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const results = [];
const pass = (s, d = '') => (results.push(true), console.log(`  PASS  ${s}${d ? ` — ${d}` : ''}`));
const fail = (s, d = '') => (results.push(false), console.log(`  FAIL  ${s}${d ? ` — ${d}` : ''}`));

// Sign an event body the way Paystack would, so the deployed webhook accepts it.
async function postSignedEvent(payload, { forge = false } = {}) {
  const sig = forge
    ? 'deadbeef'
    : crypto.createHmac('sha512', paystackKey).update(payload).digest('hex');
  const res = await fetch(`${site}/.netlify/functions/paystack-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
    body: payload,
  });
  return { status: res.status, text: await res.text() };
}

const stamp = Date.now();
const email = 'paystack-test@example.com';
const storyId = `test-book-${stamp}`;
const reference = `ref_test_${stamp}`;
let userId = null;

console.log(`\nTesting Paystack buy-a-book flow against ${site}`);
console.log(`Throwaway book: ${storyId}\n`);

// 1) Borrow an existing account id as the buyer. We only need a real auth.users
// row so the purchase's foreign key resolves; we never touch the account itself,
// and the transient purchase row is removed in cleanup. (Avoids Supabase's hourly
// signup email limit that creating a fresh user would hit.)
{
  const row = await withDb((c) =>
    c.query('select id from auth.users order by created_at limit 1'),
  ).catch(() => null);
  userId = row?.rows?.[0]?.id ?? null;
  if (userId) pass('Found an account to attribute the test purchase to', userId);
  else fail('Found an account to attribute the test purchase to', 'no users in auth.users');
}

// 2) Seed a throwaway story so the purchase's foreign key resolves -------------
try {
  await withDb((c) =>
    c.query(
      `insert into stories (id, title, format) values ($1, $2, 'standalone')
       on conflict (id) do nothing`,
      [storyId, 'Paystack Test Book'],
    ),
  );
  pass('Seed throwaway story');
} catch (e) {
  fail('Seed throwaway story', e.message);
}

if (userId) {
  // 3) create-checkout returns a Paystack checkout URL -------------------------
  try {
    const res = await fetch(`${site}/.netlify/functions/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, storyId, origin: site }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body.url && /paystack\.com/.test(body.url)) {
      pass('create-checkout returns Paystack URL');
    } else {
      fail('create-checkout', `status ${res.status} ${JSON.stringify(body)}`);
    }
  } catch (e) {
    fail('create-checkout', e.message);
  }

  // 4) webhook: charge.success -> a purchase row is recorded -------------------
  {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: { reference, amount: 5000, metadata: { userId, storyId } },
    });
    const r = await postSignedEvent(payload);
    if (r.status !== 200) fail('webhook charge.success', `status ${r.status}: ${r.text}`);
    else {
      const row = await withDb((c) =>
        c.query('select reference, amount from purchases where user_id = $1 and story_id = $2', [
          userId,
          storyId,
        ]),
      );
      const p = row.rows[0];
      if (p && p.reference === reference)
        pass('Purchase recorded via webhook', `reference=${p.reference}, amount=${p.amount}`);
      else fail('Purchase recorded via webhook', `no matching purchases row (${JSON.stringify(p)})`);
    }
  }

  // 5) webhook: a forged signature is rejected --------------------------------
  {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'ref_forged', metadata: { userId, storyId } },
    });
    const r = await postSignedEvent(payload, { forge: true });
    if (r.status === 401) pass('Forged signature rejected', '401');
    else fail('Forged signature rejected', `expected 401, got ${r.status}: ${r.text}`);
  }

  // cleanup: remove the transient purchase row (leave the borrowed account alone).
  await withDb((c) =>
    c.query('delete from purchases where user_id = $1 and story_id = $2', [userId, storyId]),
  ).catch(() => {});
}
// cleanup: remove the throwaway story (chapters + any purchases cascade).
await withDb((c) => c.query('delete from stories where id = $1', [storyId])).catch(() => {});

const failed = results.filter((r) => !r).length;
console.log(`\n${'='.repeat(60)}`);
console.log(`Result: ${results.length - failed}/${results.length} checks passed.`);
console.log('='.repeat(60) + '\n');
process.exitCode = failed > 0 ? 1 : 0;
