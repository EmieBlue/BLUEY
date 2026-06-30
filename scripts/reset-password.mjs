// Resets a user's password directly (bcrypt via pgcrypto). Tooling only.
// Usage:
//   $env:SUPABASE_DB_URL=...; $env:RESET_EMAIL=...; $env:NEW_PASSWORD=...; node scripts/reset-password.mjs
import { Client } from 'pg';

const conn = process.env.SUPABASE_DB_URL;
const email = process.env.RESET_EMAIL;
const pw = process.env.NEW_PASSWORD;
if (!conn || !email || !pw) {
  console.error('Need SUPABASE_DB_URL, RESET_EMAIL, NEW_PASSWORD env vars.');
  process.exit(1);
}

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query('create extension if not exists pgcrypto with schema extensions');
  const res = await client.query(
    "update auth.users set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')), updated_at = now() where email = $2",
    [pw, email],
  );
  console.log('Rows updated:', res.rowCount);
} catch (e) {
  console.error('Reset failed:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
