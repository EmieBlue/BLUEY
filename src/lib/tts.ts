import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';

/**
 * Natural read-aloud narration. Asks our hosted function (`/api/tts`, a
 * Cloudflare Pages Function) to turn a chapter into one natural-voice mp3 using
 * OpenAI's neural TTS, matched to the story's genre. The function caches each
 * chapter's audio in Supabase Storage, so the first "Listen" generates it and
 * every later listen (on any device) streams the same file instantly.
 */

/** Same-origin on web (first-party), SITE_URL on native. */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/tts`;
}

export async function getChapterAudioUrl(params: {
  chapterId: string;
  text: string;
  genre?: string;
}): Promise<{ url?: string; error?: string }> {
  if (!params.text.trim()) return { error: 'Nothing to read here yet.' };
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}) as { url?: string; error?: string });
    if (!res.ok || !data.url) return { error: data.error || 'Could not prepare narration.' };
    return { url: data.url };
  } catch {
    return { error: 'Couldn’t reach the narration service. Check your connection and try again.' };
  }
}
