// Paystack calls this endpoint after payment events. We verify the signature
// (HMAC-SHA512 of the raw body with our secret key), then record which book the
// reader bought in the `purchases` table. This is the source of truth for who
// owns a book — the browser never writes it directly.
import crypto from 'node:crypto';
import pg from 'pg';

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
  // Paystack signs the RAW request body; use it verbatim for both the HMAC and
  // the JSON parse.
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  const signature = event.headers['x-paystack-signature'] || event.headers['X-Paystack-Signature'];
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(raw)
    .digest('hex');
  if (!signature || signature !== expected) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return { statusCode: 400, body: 'Invalid payload' };
  }

  try {
    if (evt.event === 'charge.success') {
      const data = evt.data || {};
      const userId = data.metadata?.userId;
      const storyId = data.metadata?.storyId;
      if (userId && storyId) {
        await withDb((c) =>
          c.query(
            `insert into purchases (user_id, story_id, reference, amount)
             values ($1, $2, $3, $4)
             on conflict (user_id, story_id) do nothing`,
            [userId, storyId, data.reference ?? null, data.amount ?? null],
          ),
        );
      }
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    // Non-2xx makes Paystack retry, which is what we want on a transient DB error.
    return { statusCode: 500, body: `Handler error: ${e.message}` };
  }
}
