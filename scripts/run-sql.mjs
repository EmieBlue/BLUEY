/**
 * Runs a .sql file directly against the Supabase Postgres database, bypassing
 * the web SQL editor (whose paste was corrupting our seed). Reads the
 * connection string from `.env.seed` (gitignored) or the SUPABASE_DB_URL env var.
 *
 * Usage:  node scripts/run-sql.mjs supabase/stories.sql
 */
import { readFileSync } from 'node:fs';

import { Client } from 'pg';

function loadConnectionString() {
  try {
    const raw = readFileSync(new URL('../.env.seed', import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // no .env.seed; fall through to process env
  }
  return process.env.SUPABASE_DB_URL;
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql.mjs <path-to.sql>');
  process.exit(1);
}

const connectionString = loadConnectionString();
if (!connectionString) {
  console.error(
    'Missing SUPABASE_DB_URL. Put it in c:\\Bluy\\.env.seed as:\n' +
      '  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@...pooler.supabase.com:5432/postgres',
  );
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`OK - ran ${file} successfully.`);
} catch (e) {
  console.error(`FAILED running ${file}:`, e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
