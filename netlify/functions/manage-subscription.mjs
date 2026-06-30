// Opens the Stripe Billing Portal so a subscriber can update payment details or
// cancel. Returns the portal URL for the app to redirect to.
import Stripe from 'stripe';
import pg from 'pg';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function customerIdFor(userId) {
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const r = await client.query('select stripe_customer_id from profiles where id = $1', [userId]);
    return r.rows[0]?.stripe_customer_id || null;
  } finally {
    await client.end();
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const { userId, origin } = JSON.parse(event.body || '{}');
    if (!userId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    const customerId = await customerIdFor(userId);
    if (!customerId) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'No subscription found for this account.' }),
      };
    }

    const base = origin || process.env.SITE_URL || '';
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: base,
    });

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: portal.url }),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
}
