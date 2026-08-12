// Cloudflare Pages Function → POST /api/tts
// Natural read-aloud narration for a chapter, using OpenAI's neural TTS. The
// whole chapter is turned into ONE mp3 (chunked under OpenAI's 4096-char input
// limit, generated in parallel, then concatenated) and cached in a public
// Supabase Storage bucket `tts` so each chapter is only ever generated (paid
// for) once. The same file is served to phone + web → identical, natural voice
// everywhere, and it's matched to the story's genre.
//   POST { chapterId, text, genre } → { url, cached }

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
  const { chapterId, text, genre } = body;
  if (!chapterId || !text || !text.trim()) return json(400, { error: 'Missing chapterId or text.' });
  if (!env.OPENAI_API_KEY) return json(502, { error: 'Narration is not configured yet.' });

  const { voice, instructions } = pickVoice(genre);
  const objectPath = `${chapterId}-${voice}.mp3`;
  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/tts/${objectPath}`;

  // Already generated? Serve the cached file.
  try {
    const head = await fetch(publicUrl, { method: 'HEAD' });
    if (head.ok) return json(200, { url: publicUrl, cached: true });
  } catch {
    /* fall through to generate */
  }

  // Generate every chunk in parallel, preserving order.
  const chunks = chunkText(text);
  let parts;
  try {
    parts = await Promise.all(
      chunks.map(async (chunk) => {
        const r = await fetch('https://api.openai.com/v1/audio/speech', {
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
        });
        if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
        return new Uint8Array(await r.arrayBuffer());
      }),
    );
  } catch (e) {
    return json(502, { error: `Could not generate narration: ${e.message}` });
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
  const up = await fetch(`${env.SUPABASE_URL}/storage/v1/object/tts/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: combined,
  });
  if (!up.ok) {
    return json(502, { error: `Could not save narration: ${(await up.text()).slice(0, 300)}` });
  }

  return json(200, { url: publicUrl, cached: false });
}
