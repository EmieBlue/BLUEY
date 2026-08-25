// Cloudflare Pages Function → POST /api/comic-pages
// Serves a comic chapter's page images to authorised readers only. Same-origin +
// neutral name (ad-blocker safe, like /api/notes). Pages live in the PRIVATE
// `comics` Storage bucket; their object paths sit in the premium-gated
// chapters.paragraphs, so access is decided by the same hard-lock as text.
//   POST { storyId, chapterId, accessToken? } → { pages: [signedUrl…] } | 403 {locked:true}

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
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Bad request.' });
  }
  const { storyId, chapterId, accessToken } = body;
  if (!storyId || !chapterId) return json(400, { error: 'Missing storyId or chapterId.' });

  // 1) Gate + fetch page paths via the SECURITY DEFINER RPC, as the caller. It
  //    returns the paths only for a free-preview chapter, the owner, or a buyer.
  const rpcRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_chapter_content`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_story_id: storyId, p_chapter_id: chapterId }),
  });
  if (!rpcRes.ok) return json(502, { error: 'Could not load pages.' });
  const paths = await rpcRes.json();
  if (!Array.isArray(paths) || paths.length === 0) return json(403, { locked: true });

  // 2) Mint short-lived signed URLs with the service role (bypasses bucket RLS).
  const signRes = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/comics`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 3600, paths }),
  });
  if (!signRes.ok) return json(502, { error: 'Could not prepare pages.' });
  const signed = await signRes.json(); // [{ signedURL, path, error }]
  const base = `${env.SUPABASE_URL}/storage/v1`;
  const byPath = new Map((Array.isArray(signed) ? signed : []).map((s) => [s.path, s.signedURL]));
  // Preserve the stored page order.
  const pages = paths
    .map((p) => (byPath.get(p) ? base + byPath.get(p) : null))
    .filter(Boolean);
  if (pages.length === 0) return json(502, { error: 'Could not prepare pages.' });
  return json(200, { pages });
}
