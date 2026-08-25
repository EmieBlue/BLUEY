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

export async function fetchComicPages(
  storyId: string,
  chapterId: string,
): Promise<{ pages: string[]; locked: boolean; failed: boolean }> {
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
    return { pages: data.pages, locked: false, failed: false };
  } catch {
    return { pages: [], locked: false, failed: true };
  }
}
