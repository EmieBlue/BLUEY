// Cloudflare Pages Function → GET/POST /api/notes
// Same-origin proxy for per-chapter reader comments (dodges ad-blockers that
// block direct cross-origin writes to *.supabase.co). Talks to Supabase's REST
// API with plain fetch — no npm deps, so it bundles cleanly on Workers.
//   GET  ?story_id=&chapter_id=            → { notes: [...] } (public read)
//   POST { accessToken, storyId, chapterId, body }         → { note }
//   POST { accessToken, action:'delete', id }              → { ok:true }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const COLS = 'id,story_id,chapter_id,user_id,author_name,body,created_at';

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const storyId = u.searchParams.get('story_id');
  const chapterId = u.searchParams.get('chapter_id');
  if (!storyId || !chapterId) return json(400, { error: 'Missing story_id or chapter_id.' });

  const rest =
    `${env.SUPABASE_URL}/rest/v1/reader_notes` +
    `?story_id=eq.${encodeURIComponent(storyId)}` +
    `&chapter_id=eq.${encodeURIComponent(chapterId)}` +
    `&select=${COLS}&order=created_at.asc`;
  const res = await fetch(rest, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return json(502, { error: 'Could not load comments.' });
  const notes = await res.json();
  return json(200, { notes });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Bad request.' });
  }

  const token = body.accessToken;
  if (!token) return json(401, { error: 'Please sign in to continue.' });

  // Verify the caller's session and read their identity from Supabase Auth.
  const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!uRes.ok) return json(401, { error: 'Your session expired. Please sign in again.' });
  const user = await uRes.json();

  // Delete (author or comment owner — enforced by RLS with the user's token).
  if (body.action === 'delete') {
    if (!body.id) return json(400, { error: 'Missing id.' });
    const dRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/reader_notes?id=eq.${encodeURIComponent(body.id)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: 'return=minimal',
        },
      },
    );
    if (!dRes.ok) return json(502, { error: 'Could not delete.' });
    return json(200, { ok: true });
  }

  // Post a new comment.
  const text = (body.body || '').trim();
  if (!body.storyId || !body.chapterId || !text) return json(400, { error: 'Missing fields.' });
  const dn = user.user_metadata?.display_name;
  const authorName =
    (typeof dn === 'string' && dn.trim()) || (user.email ? user.email.split('@')[0] : 'Reader');

  const iRes = await fetch(`${env.SUPABASE_URL}/rest/v1/reader_notes`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      story_id: body.storyId,
      chapter_id: body.chapterId,
      user_id: user.id,
      author_name: authorName,
      body: text.slice(0, 1000),
    }),
  });
  const rows = await iRes.json().catch(() => null);
  if (!iRes.ok || !Array.isArray(rows) || !rows[0]) {
    return json(502, { error: (rows && rows.message) || 'Could not post your comment.' });
  }
  return json(200, { note: rows[0] });
}
