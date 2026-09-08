import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';
import { supabase } from '@/lib/supabase';

/**
 * Fetch a comic chapter's page images as short-lived signed URLs. Goes through
 * our same-origin function (`/api/comic-pages`) which enforces the same purchase
 * gate as text and signs the private bucket objects server-side. `locked` is
 * true when the reader isn't allowed (premium chapter, not bought).
 */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/comic-pages`;
}

async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}

// In-memory cache of a chapter's signed page URLs, so leaving and returning to
// a chapter within the same app session doesn't re-run the fetch chain. Kept
// comfortably under the server's signed-URL expiry (21600s / 6h) so a cache
// hit is always still a live URL.
const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5h
const cache = new Map<string, { pages: string[]; expiresAt: number }>();

export async function fetchComicPages(
  storyId: string,
  chapterId: string,
): Promise<{ pages: string[]; locked: boolean; failed: boolean }> {
  const key = `${storyId}:${chapterId}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { pages: cached.pages, locked: false, failed: false };
  }
  try {
    const token = await accessToken();
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, chapterId, accessToken: token }),
    });
    if (res.status === 403) return { pages: [], locked: true, failed: false };
    const data = await res.json().catch(() => ({}) as { pages?: string[] });
    if (!res.ok || !Array.isArray(data.pages)) return { pages: [], locked: false, failed: true };
    cache.set(key, { pages: data.pages, expiresAt: Date.now() + CACHE_TTL_MS });
    return { pages: data.pages, locked: false, failed: false };
  } catch {
    return { pages: [], locked: false, failed: true };
  }
}
