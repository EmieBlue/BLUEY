// Cloudflare Pages Function → GET/POST /api/reviews
// Same-origin proxy for book ratings & reviews (mirrors /api/notes; dodges
// ad-blockers that block direct cross-origin writes to *.supabase.co). Talks to
// Supabase REST with plain fetch — no npm deps, bundles cleanly on Workers.
//   GET  ?story_id=                                   → { reviews: [...] } (public)
//   POST { accessToken, storyId, rating, body? }      → { review }  (upsert)
//   POST { accessToken, action:'delete', storyId, targetUserId? } → { ok:true }

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

const COLS = 'user_id,story_id,rating,author_name,body,created_at';

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const storyId = u.searchParams.get('story_id');
  if (!storyId) return json(400, { error: 'Missing story_id.' });

  const rest =
    `${env.SUPABASE_URL}/rest/v1/reviews` +
    `?story_id=eq.${encodeURIComponent(storyId)}` +
    `&select=${COLS}&order=created_at.desc`;
  const res = await fetch(rest, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return json(502, { error: 'Could not load reviews.' });
  const reviews = await res.json();
  return json(200, { reviews });
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

  if (!body.storyId) return json(400, { error: 'Missing storyId.' });

  // Delete (own review, or any review on a book you authored — RLS enforced).
  if (body.action === 'delete') {
    const target = body.targetUserId || user.id;
    const dRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/reviews` +
        `?user_id=eq.${encodeURIComponent(target)}&story_id=eq.${encodeURIComponent(body.storyId)}`,
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

  // Upsert a rating (+ optional text).
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(400, { error: 'Pick a rating from 1 to 5 stars.' });
  }
  const text = (body.body || '').trim().slice(0, 4000);
  const dn = user.user_metadata?.display_name;
  const authorName =
    (typeof dn === 'string' && dn.trim()) || (user.email ? user.email.split('@')[0] : 'Reader');

  const iRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/reviews?on_conflict=user_id,story_id`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: user.id,
        story_id: body.storyId,
        rating,
        body: text || null,
        author_name: authorName,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  const rows = await iRes.json().catch(() => null);
  if (!iRes.ok || !Array.isArray(rows) || !rows[0]) {
    return json(502, { error: (rows && rows.message) || 'Could not save your review.' });
  }
  return json(200, { review: rows[0] });
}
