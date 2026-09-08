// Cloudflare Pages Function → /api/narrate  (natural read-aloud narration)
//
// Replaces /api/tts with a name that ad/privacy blockers don't recognise, AND
// serves the audio through THIS same-origin function so the browser never talks
// to *.supabase.co directly (some blockers block that cross-origin request).
//
//   POST /api/narrate { chapterId, text, genre }  → { url, cached }
//        url = an absolute same-origin `…/api/narrate?f=<file>` audio URL.
//   GET  /api/narrate?f=<file>                     → streams the cached mp3.
//
// The audio is generated once with OpenAI's neural TTS (voice matched to the
// story's genre) and cached in the public Supabase Storage bucket `tts`.

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

// Genre → OpenAI voice + a tone instruction so the narration "acts out" the story.
const VOICE_MAP = {
  Romance: { voice: 'coral', instructions: 'Narrate warmly and intimately, with a soft, tender, sensual, romantic tone that makes the listener feel the emotion.' },
  Thriller: { voice: 'onyx', instructions: 'Narrate with tense, urgent, suspenseful energy that keeps the listener on edge.' },
  Fantasy: { voice: 'fable', instructions: 'Narrate like an epic, wondrous storyteller weaving a grand and magical tale.' },
  Mystery: { voice: 'sage', instructions: 'Narrate in a measured, intriguing, noir tone, thick with suspense and quiet tension.' },
  'Sci-Fi': { voice: 'echo', instructions: 'Narrate with a crisp, cool, cinematic, slightly futuristic tone.' },
  Literary: { voice: 'ballad', instructions: 'Narrate solemnly and expressively, like a polished literary audiobook narrator.' },
};
const DEFAULT_VOICE = { voice: 'alloy', instructions: 'Narrate clearly and expressively, like a warm professional audiobook narrator.' };

function pickVoice(genre) {
  return VOICE_MAP[genre] || DEFAULT_VOICE;
}

// Split text into <= ~3800-char chunks on paragraph, then sentence, boundaries.
function chunkText(text, max = 3800) {
  const paras = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = '';
  };
  for (const p of paras) {
    if (p.length > max) {
      push();
      const sentences = p.match(/[^.!?]+[.!?]*\s*/g) || [p];
      for (const s of sentences) {
        // A single "sentence" can itself exceed max (em dashes, ellipses, or
        // just long unbroken prose with no . ! ? boundaries) — hard-slice it
        // by character count so no chunk ever exceeds OpenAI's input limit.
        if (s.length > max) {
          push();
          for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max).trim());
          continue;
        }
        if ((cur + s).length > max) push();
        cur += s;
      }
      push();
    } else if ((cur + '\n\n' + p).length > max) {
      push();
      cur = p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }
  push();
  return chunks.length ? chunks : [text.slice(0, max)];
}

// Short, stable hash of the chapter text — used to key the cached audio file
// so an edited chapter (or one that got a bad cached response) regenerates
// instead of staying stuck on stale audio forever.
async function hashText(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET → same-origin audio proxy: stream the cached mp3 from Supabase Storage so
// the browser only ever talks to blueyclub.com (dodges blockers on supabase.co).
export async function onRequestGet({ request, env }) {
  const f = new URL(request.url).searchParams.get('f');
  if (!f || !/^[\w.\-]+$/.test(f)) return new Response('Bad request', { status: 400 });
  const supaUrl = `${env.SUPABASE_URL}/storage/v1/object/public/tts/${f}`;
  const range = request.headers.get('Range');
  const upstream = await fetch(supaUrl, { headers: range ? { Range: range } : {} });
  const headers = new Headers({
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });
  const cr = upstream.headers.get('Content-Range');
  if (cr) headers.set('Content-Range', cr);
  const cl = upstream.headers.get('Content-Length');
  if (cl) headers.set('Content-Length', cl);
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function onRequestPost(context) {
  // Outer guard: ANY unexpected error still returns clean JSON (never a 1101
  // HTML page, which the client can't parse and reports as "couldn't reach").
  try {
    return await handle(context);
  } catch (e) {
    return json(500, { error: `Narration error: ${(e && e.message) || e}` });
  }
}

async function handle({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Bad request.' });
  }
  const { chapterId, text, genre } = body;
  if (!chapterId || !text || !text.trim()) return json(400, { error: 'Missing chapterId or text.' });
  if (!env.OPENAI_API_KEY) return json(502, { error: 'Narration is not configured yet.' });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(502, { error: 'Narration is not configured yet.' });
  }

  const { voice, instructions } = pickVoice(genre);
  // Fold a hash of the text into the cache key so editing a chapter (or a
  // chapter that was cached with bad/refusal audio) naturally invalidates the
  // old file instead of being stuck forever.
  const hash = await hashText(text);
  const objectPath = `${chapterId}-${voice}-${hash}.mp3`;
  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/tts/${objectPath}`;
  // Same-origin audio URL the browser will actually play.
  const origin = new URL(request.url).origin;
  const sameOriginUrl = `${origin}/api/narrate?f=${encodeURIComponent(objectPath)}`;

  // Already generated? Serve the cached file.
  try {
    const head = await fetchWithTimeout(publicUrl, { method: 'HEAD' }, 10000);
    if (head.ok) return json(200, { url: sameOriginUrl, cached: true });
  } catch {
    /* fall through to generate */
  }

  // Generate every chunk in parallel, preserving order.
  const chunks = chunkText(text);
  let parts;
  try {
    parts = await Promise.all(
      chunks.map(async (chunk) => {
        const r = await fetchWithTimeout(
          'https://api.openai.com/v1/audio/speech',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini-tts',
              voice,
              input: chunk,
              instructions,
              response_format: 'mp3',
            }),
          },
          25000,
        );
        if (!r.ok) {
          const err = new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
          err.status = r.status;
          throw err;
        }
        const bytes = new Uint8Array(await r.arrayBuffer());
        // A near-empty response (truncated stream, or a refusal so short it's
        // clearly not real narration) shouldn't ever be cached as if it were
        // good audio.
        if (bytes.length < 2000) {
          throw new Error('Empty or truncated audio from OpenAI.');
        }
        return bytes;
      }),
    );
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return json(502, { error: 'Narration timed out — please try again.' });
    }
    // 429/5xx from OpenAI is transient (worth retrying); anything else
    // (400/401/403/422…) is a permanent failure the client shouldn't retry.
    const upstream = e && e.status;
    const permanent = upstream && upstream !== 429 && upstream < 500;
    return json(permanent ? 400 : 503, { error: `Could not generate narration: ${e.message}` });
  }

  // Concatenate the mp3 parts into one file.
  const total = parts.reduce((n, p) => n + p.length, 0);
  const combined = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    combined.set(p, off);
    off += p.length;
  }

  // Upload to Supabase Storage (service_role, upsert).
  let up;
  try {
    up = await fetchWithTimeout(
      `${env.SUPABASE_URL}/storage/v1/object/tts/${objectPath}`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'audio/mpeg',
          'x-upsert': 'true',
        },
        body: combined,
      },
      25000,
    );
  } catch (e) {
    return json(502, { error: `Could not save narration: ${(e && e.message) || e}` });
  }
  if (!up.ok) {
    return json(502, { error: `Could not save narration: ${(await up.text()).slice(0, 200)}` });
  }

  return json(200, { url: sameOriginUrl, cached: false });
}
