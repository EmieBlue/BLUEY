// Read-only: prints the auth.users state to diagnose sign-in issues.
// Usage:  $env:SUPABASE_DB_URL="postgresql://..."; node scripts/inspect-auth.mjs
import { Client } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Set SUPABASE_DB_URL first.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const res = await client.query(
    `select email, email_confirmed_at, last_sign_in_at, banned_until, created_at
     from auth.users order by created_at`,
  );
  console.table(
    res.rows.map((r) => ({
      email: r.email,
      confirmed: r.email_confirmed_at ? 'yes' : 'NO',
      last_sign_in: r.last_sign_in_at ? String(r.last_sign_in_at) : 'never',
      banned_until: r.banned_until ? String(r.banned_until) : '-',
    })),
  );
} catch (e) {
  console.error('Inspect failed:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
