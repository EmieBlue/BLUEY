// Starts a one-time Paystack payment to unlock a single book ("buy the book")
// and returns the hosted checkout URL. The app redirects the user there; card /
// mobile-money details never touch our code. On success the webhook records the
// purchase (which book this reader now owns).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const { userId, email, storyId, origin } = JSON.parse(event.body || '{}');
    if (!userId || !storyId) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Missing userId or storyId' }),
      };
    }
    // Paystack requires an email to create the customer + charge.
    if (!email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'An email is required to buy a book. Please sign in first.' }),
      };
    }

    const amount = Number(process.env.PAYSTACK_BOOK_AMOUNT); // pesewas, e.g. 6000 = GH₵60
    if (!amount) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: 'Book price is not configured.' }),
      };
    }

    const base = origin || process.env.SITE_URL || '';
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount, // one-time charge — no `plan`, so nothing recurs
        metadata: { userId, storyId }, // ties the payment to the reader + the book
        callback_url: `${base}/?purchase=success&story=${encodeURIComponent(storyId)}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.status || !data.data?.authorization_url) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: data.message || 'Could not start checkout.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.data.authorization_url }),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
}
