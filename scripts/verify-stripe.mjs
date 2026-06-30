/**
 * End-to-end test of the Stripe subscription flow against the DEPLOYED Netlify
 * Functions. Test mode only — no real money moves.
 *
 * It proves our code paths:
 *   - create-checkout    -> returns a Stripe Checkout URL (secret key + price valid)
 *   - stripe-webhook     -> a signed `checkout.session.completed` flips
 *                           profiles.is_subscribed -> true (and sets stripe_customer_id)
 *   - stripe-webhook     -> a signed `customer.subscription.deleted` flips it back -> false
 *
 * Reads Supabase creds from `.env`, the DB string from `.env.seed`, and the two
 * Stripe secrets from the environment (so they never touch a file):
 *
 *   STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... \
 *     node scripts/verify-stripe.mjs
 */
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import pg from 'pg';

// --- config ----------------------------------------------------------------
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
const url = readFrom('../.env', 'EXPO_PUBLIC_SUPABASE_URL') ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey =
  readFrom('../.env', 'EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const dbUrl = readFrom('../.env.seed', 'SUPABASE_DB_URL') ?? process.env.SUPABASE_DB_URL;
const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const priceId = process.env.STRIPE_PRICE_ID || 'price_1Tk5j247sU9dGoBmW11YemHH';
const site = (process.env.SITE_URL || 'https://bluy-4az69d.netlify.app').replace(/\/$/, '');

for (const [k, v] of Object.entries({ url, anonKey, dbUrl, stripeKey, webhookSecret })) {
  if (!v) {
    console.error(`Missing ${k}. (Stripe secrets are passed via env; see header.)`);
    process.exit(1);
  }
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

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

// Sign an event body the way Stripe would, so the deployed webhook accepts it.
async function postSignedEvent(type, object) {
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type,
    data: { object },
  });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const res = await fetch(`${site}/.netlify/functions/stripe-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: payload,
  });
  return { status: res.status, text: await res.text() };
}

const stamp = Date.now();
const email = `bluy-test+stripe${stamp}@gmail.com`;
const password = `Test-${stamp}-pw!`;
const customerId = `cus_test_${stamp}`;
let userId = null;

console.log(`\nTesting Stripe flow against ${site}`);
console.log(`Test account: ${email}\n`);

// 0) Price is active + in TEST mode --------------------------------------------
try {
  const price = await stripe.prices.retrieve(priceId);
  if (!price.active) fail('Price active', `${priceId} is inactive`);
  else if (price.livemode) fail('Price is Test mode', `${priceId} is a LIVE price — use a test key/price`);
  else pass('Price active + Test mode', `${priceId} (${(price.unit_amount / 100).toFixed(2)} ${price.currency})`);
} catch (e) {
  fail('Retrieve price', e.message);
}

// 1) Make a temp user (signup trigger creates the profiles row) ----------------
{
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) fail('Create temp user', error?.message || 'no user');
  else {
    userId = data.user.id;
    pass('Create temp user', userId);
  }
}

if (userId) {
  // 2) create-checkout returns a Checkout URL ----------------------------------
  try {
    const res = await fetch(`${site}/.netlify/functions/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, origin: site }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body.url && /stripe\.com/.test(body.url)) {
      pass('create-checkout returns Checkout URL');
    } else {
      fail('create-checkout', `status ${res.status} ${JSON.stringify(body)}`);
    }
  } catch (e) {
    fail('create-checkout', e.message);
  }

  // 3) webhook: checkout.session.completed -> is_subscribed true ----------------
  {
    const r = await postSignedEvent('checkout.session.completed', {
      client_reference_id: userId,
      customer: customerId,
    });
    if (r.status !== 200) fail('webhook checkout.session.completed', `status ${r.status}: ${r.text}`);
    else {
      const row = await withDb((c) =>
        c.query('select is_subscribed, stripe_customer_id from profiles where id = $1', [userId]),
      );
      const p = row.rows[0] || {};
      if (p.is_subscribed && p.stripe_customer_id === customerId)
        pass('Subscribe via webhook', 'is_subscribed=true, customer linked');
      else fail('Subscribe via webhook', `is_subscribed=${p.is_subscribed}, customer=${p.stripe_customer_id}`);
    }
  }

  // 4) webhook: customer.subscription.deleted -> is_subscribed false ------------
  {
    const r = await postSignedEvent('customer.subscription.deleted', { customer: customerId });
    if (r.status !== 200) fail('webhook subscription.deleted', `status ${r.status}: ${r.text}`);
    else {
      const row = await withDb((c) =>
        c.query('select is_subscribed from profiles where id = $1', [userId]),
      );
      if (row.rows[0]?.is_subscribed === false) pass('Cancel via webhook', 'is_subscribed=false');
      else fail('Cancel via webhook', `is_subscribed=${row.rows[0]?.is_subscribed}`);
    }
  }

  // cleanup: delete the temp user (cascades to profiles)
  await withDb((c) => c.query('delete from auth.users where id = $1', [userId])).catch(() => {});
}

const failed = results.filter((r) => !r).length;
console.log(`\n${'='.repeat(60)}`);
console.log(`Result: ${results.length - failed}/${results.length} checks passed.`);
console.log('='.repeat(60) + '\n');
process.exitCode = failed > 0 ? 1 : 0;
