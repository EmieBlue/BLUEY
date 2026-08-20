// Cloudflare Pages Function → POST /api/create-checkout
// Starts a one-time Paystack payment to unlock a single book and returns the
// hosted checkout URL. (Cloudflare port of the old Netlify create-checkout.)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    const { userId, email, storyId, origin } = await request.json();
    if (!userId || !storyId) return json(400, { error: 'Missing userId or storyId' });
    if (!email) {
      return json(400, { error: 'An email is required to buy a book. Please sign in first.' });
    }
    const amount = Number(env.PAYSTACK_BOOK_AMOUNT); // pesewas, e.g. 6000 = GH₵60
    if (!amount) return json(502, { error: 'Book price is not configured.' });

    // Trim the secret defensively: a stray space/newline pasted into the env var
    // makes an invalid Authorization header and the request fails with a bare 502.
    const secret = (env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) return json(502, { error: 'Payment key is not configured.' });

    const base = origin || env.SITE_URL || '';
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        metadata: { userId, storyId },
        callback_url: `${base}/?purchase=success&story=${encodeURIComponent(storyId)}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.status || !data.data?.authorization_url) {
      return json(502, { error: data.message || 'Could not start checkout.' });
    }
    return json(200, { url: data.data.authorization_url });
  } catch (e) {
    return json(500, { error: e.message });
  }
}
