// Cloudflare Pages Function → POST /api/push-subscribe
// Stores a browser's Web-Push subscription so we can notify the reader later.
//   POST { subscription:{endpoint,keys:{p256dh,auth}}, accessToken? }
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Bad request.' });
  }
  const sub = body.subscription || body;
  const endpoint = sub && sub.endpoint;
  const p256dh = sub && sub.keys && sub.keys.p256dh;
  const auth = sub && sub.keys && sub.keys.auth;
  if (!endpoint || !p256dh || !auth) return json(400, { error: 'Invalid subscription.' });

  let user_id = null;
  if (body.accessToken) {
    try {
      const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${body.accessToken}` },
      });
      if (u.ok) user_id = (await u.json()).id || null;
    } catch {
      /* anonymous subscription is fine */
    }
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ endpoint, p256dh, auth, user_id }),
  });
  if (!res.ok && res.status !== 409) {
    return json(502, { error: `Could not save subscription: ${(await res.text()).slice(0, 200)}` });
  }
  return json(200, { ok: true });
}
