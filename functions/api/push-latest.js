// Cloudflare Pages Function → GET /api/push-latest
// The service worker fetches this when a (payload-less) push arrives, to learn
// what to show. Returns the most recent broadcast message.
export async function onRequestGet({ env }) {
  let m = {};
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/push_last?id=eq.1&select=title,body,url`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]) m = rows[0];
  } catch {
    /* fall back to defaults below */
  }
  return new Response(
    JSON.stringify({ title: m.title || 'Bluey', body: m.body || 'Something new to read.', url: m.url || '/' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
