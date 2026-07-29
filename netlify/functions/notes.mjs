// Same-origin proxy for chapter comments ("reader_notes"). The browser talks to
// THIS function (first-party, on our own domain) instead of calling Supabase
// directly, because ad-blockers / privacy shields drop cross-origin writes to
// supabase.co (that's what caused "TypeError: Failed to fetch" when posting).
// Reading is public; posting/deleting forward the user's Supabase JWT so RLS is
// still enforced as that user.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};
const COLUMNS = 'id, story_id, chapter_id, user_id, author_name, body, created_at';
const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

// A Supabase client that acts as the signed-in user (so RLS applies to them).
const asUser = (token) =>
  createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (!URL || !ANON) return json(502, { error: 'Comments are not configured.' });

  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  try {
    // --- Read (public) --------------------------------------------------------
    if (event.httpMethod === 'GET') {
      const { story_id, chapter_id } = event.queryStringParameters || {};
      if (!story_id || !chapter_id) return json(400, { error: 'Missing story_id or chapter_id.' });
      const { data, error } = await anon
        .from('reader_notes')
        .select(COLUMNS)
        .eq('story_id', story_id)
        .eq('chapter_id', chapter_id)
        .order('created_at', { ascending: true });
      if (error) return json(502, { error: error.message });
      return json(200, { notes: data ?? [] });
    }

    const body = JSON.parse(event.body || '{}');
    const token = body.accessToken;
    if (!token) return json(401, { error: 'Please sign in to continue.' });

    // Verify who the caller actually is (don't trust client-supplied identity).
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { error: 'Your session expired. Please sign in again.' });
    }
    const user = userData.user;

    // --- Delete (own comment, or any on a story you authored — enforced by RLS) --
    if (event.httpMethod === 'DELETE' || body.action === 'delete') {
      if (!body.id) return json(400, { error: 'Missing id.' });
      const { error } = await asUser(token).from('reader_notes').delete().eq('id', body.id);
      if (error) return json(502, { error: error.message });
      return json(200, { ok: true });
    }

    // --- Post ----------------------------------------------------------------
    if (event.httpMethod === 'POST') {
      const text = (body.body || '').trim();
      if (!body.storyId || !body.chapterId || !text) return json(400, { error: 'Missing fields.' });
      // Name comes from the verified user, so it can't be spoofed by the client.
      const dn = user.user_metadata?.display_name;
      const authorName =
        (typeof dn === 'string' && dn.trim()) || user.email?.split('@')[0] || 'Reader';
      const { data, error } = await asUser(token)
        .from('reader_notes')
        .insert({
          story_id: body.storyId,
          chapter_id: body.chapterId,
          user_id: user.id,
          author_name: authorName,
          body: text.slice(0, 1000),
        })
        .select(COLUMNS)
        .single();
      if (error) return json(502, { error: error.message });
      return json(200, { note: data });
    }

    return json(405, { error: 'Method not allowed.' });
  } catch (e) {
    return json(500, { error: e.message });
  }
}
