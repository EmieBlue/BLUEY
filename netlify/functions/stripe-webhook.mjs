// Stripe calls this endpoint after payment events. We verify the signature, then
// flip `profiles.is_subscribed` in Supabase. This is the source of truth for who
// has premium — the browser never sets it directly.
import Stripe from 'stripe';
import pg from 'pg';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function withDb(fn) {
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function handler(event) {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let evt;
  try {
    const payload = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    evt = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${e.message}` };
  }

  try {
    if (evt.type === 'checkout.session.completed') {
      const s = evt.data.object;
      const userId = s.client_reference_id;
      const customerId = s.customer;
      if (userId) {
        await withDb((c) =>
          c.query(
            'update profiles set is_subscribed = true, stripe_customer_id = $2 where id = $1',
            [userId, customerId],
          ),
        );
      }
    } else if (evt.type === 'customer.subscription.deleted') {
      const customerId = evt.data.object.customer;
      if (customerId) {
        await withDb((c) =>
          c.query('update profiles set is_subscribed = false where stripe_customer_id = $1', [
            customerId,
          ]),
        );
      }
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    return { statusCode: 500, body: `Handler error: ${e.message}` };
  }
}
