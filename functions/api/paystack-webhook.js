// Cloudflare Pages Function → POST /api/paystack-webhook
// Paystack calls this after a payment. We verify the signature (HMAC-SHA512 of
// the raw body with the secret key) using Web Crypto, then record the unlock in
// the `purchases` table via Supabase REST with the service_role key (bypasses
// RLS — this runs server-side only). No npm deps, so it bundles on Workers.

async function hmacSha512Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';
  // Trim defensively — a stray space/newline in the pasted secret would make the
  // HMAC mismatch Paystack's and silently reject every genuine webhook.
  const expected = await hmacSha512Hex((env.PAYSTACK_SECRET_KEY || '').trim(), raw);
  if (!signature || signature !== expected) {
    return new Response('Invalid signature', { status: 401 });
  }

  let evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  try {
    if (evt.event === 'charge.success') {
      const data = evt.data || {};
      const userId = data.metadata?.userId;
      const storyId = data.metadata?.storyId;
      if (userId && storyId) {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/purchases`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            // Don't error if this purchase was already recorded.
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            story_id: storyId,
            reference: data.reference ?? null,
            amount: data.amount ?? null,
          }),
        });
        if (!res.ok && res.status !== 409) {
          const t = await res.text();
          return new Response(`DB error: ${t}`, { status: 500 });
        }
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Handler error: ${e.message}`, { status: 500 });
  }
}
