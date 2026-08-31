// Cloudflare Pages Function → POST /api/comic-upload
// Same-origin upload for comic page images, so an ad-blocker can't block a
// cross-origin write to *.supabase.co (the reason /api/notes, /api/reviews etc.
// exist). The signed-in author POSTs the image bytes; we verify their session,
// then store the file in the PRIVATE `comics` bucket with the service role.
//   POST (body = image bytes)
//     headers: Content-Type: image/…, x-access-token: <supabase session token>
//   → { path }   (store this in the chapter; served later via /api/comic-pages)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-access-token',
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
  const token = request.headers.get('x-access-token');
  if (!token) return json(401, { error: 'Please sign in to upload.' });

  // Verify the caller's session → their user id (used as the storage folder).
  const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!uRes.ok) return json(401, { error: 'Your session expired. Please sign in again.' });
  const user = await uRes.json();

  const contentType = request.headers.get('content-type') || 'image/jpeg';
  const ext = (contentType.split('/')[1] || 'jpg').split(';')[0].replace(/[^a-z0-9]/gi, '') || 'jpg';
  const bytes = await request.arrayBuffer();
  if (!bytes || bytes.byteLength === 0) return json(400, { error: 'Empty file.' });

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const upRes = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/comics/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: bytes,
    },
  );
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => '');
    return json(502, { error: `Could not save the page. ${t}`.trim() });
  }
  return json(200, { path });
}
