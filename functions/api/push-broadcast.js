// Cloudflare Pages Function → POST /api/push-broadcast
// Authors only. Saves the message (so the SW can display it) and sends a
// payload-less Web Push to every stored subscription, authenticated with VAPID
// (ES256 JWT signed via Web Crypto). Dead subscriptions (404/410) are pruned.
//   POST { title, body, url, accessToken }
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function b64urlBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64url = (str) => b64urlBytes(new TextEncoder().encode(str));

async function buildVapidJwt(aud, subject, key) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(
    JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }),
  );
  const signingInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64urlBytes(new Uint8Array(sig))}`;
}

const sh = (env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
});

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
  const { title, body: message, url, accessToken } = body;
  if (!accessToken) return json(401, { error: 'Please sign in.' });
  if (!title) return json(400, { error: 'Missing title.' });
  if (!env.VAPID_PRIVATE_KEY) return json(502, { error: 'Notifications are not configured.' });

  // Verify the caller is an author.
  const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!u.ok) return json(401, { error: 'Your session expired.' });
  const user = await u.json();
  const pr = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_author`,
    { headers: sh(env) },
  );
  const prj = await pr.json().catch(() => []);
  if (!Array.isArray(prj) || !prj[0] || !prj[0].is_author) {
    return json(403, { error: 'Only authors can send notifications.' });
  }

  // Remember what to show (SW fetches /api/push-latest).
  await fetch(`${env.SUPABASE_URL}/rest/v1/push_last?id=eq.1`, {
    method: 'PATCH',
    headers: { ...sh(env), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ title, body: message || '', url: url || '/', updated_at: new Date().toISOString() }),
  });

  // Load subscriptions.
  const sres = await fetch(
    `${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`,
    { headers: sh(env) },
  );
  const subs = await sres.json().catch(() => []);
  if (!Array.isArray(subs)) return json(502, { error: 'Could not load subscribers.' });

  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const jwtByOrigin = {};
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        const origin = new URL(s.endpoint).origin;
        if (!jwtByOrigin[origin]) {
          jwtByOrigin[origin] = await buildVapidJwt(origin, env.VAPID_SUBJECT, key);
        }
        const r = await fetch(s.endpoint, {
          method: 'POST',
          headers: {
            Authorization: `vapid t=${jwtByOrigin[origin]}, k=${env.VAPID_PUBLIC_KEY}`,
            TTL: '86400',
          },
        });
        if (r.status === 404 || r.status === 410) {
          await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
            { method: 'DELETE', headers: sh(env) },
          );
          removed++;
        } else if (r.ok || r.status === 201) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }),
  );

  return json(200, { sent, removed, failed, total: subs.length });
}
