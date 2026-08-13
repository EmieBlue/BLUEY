import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';

/**
 * Natural read-aloud narration. Asks our hosted function (`/api/narrate`, a
 * Cloudflare Pages Function) to turn a chapter into one natural-voice mp3 using
 * OpenAI's neural TTS, matched to the story's genre. The function caches each
 * chapter's audio in Supabase Storage and returns a SAME-ORIGIN audio URL it
 * proxies itself, so the browser only ever talks to our own site — this dodges
 * ad/privacy blockers that would otherwise block the request or the supabase.co
 * audio. (The endpoint is deliberately named "narrate", not "tts", for the same
 * reason.)
 */

/** Same-origin on web (first-party), SITE_URL on native. */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/narrate`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getChapterAudioUrl(params: {
  chapterId: string;
  text: string;
  genre?: string;
}): Promise<{ url?: string; error?: string }> {
  if (!params.text.trim()) return { error: 'Nothing to read here yet.' };

  // The first generation of a chapter can take a few seconds, and a slow browser
  // connection sometimes drops before the reply arrives — even though the server
  // still finished and cached the audio. So retry a few times: a later attempt
  // usually lands on the freshly-cached file and returns instantly.
  let lastError = 'Could not prepare narration.';
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(2000);
    try {
      const res = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}) as { url?: string; error?: string });
      if (res.ok && data.url) return { url: data.url };
      lastError = data.error || lastError;
      // Definitive errors won't fix themselves on retry — stop early.
      if (res.status === 400 || res.status === 401) return { error: lastError };
    } catch {
      lastError = 'Couldn’t reach the narration service. Check your connection and try again.';
    }
  }
  return { error: lastError };
}
