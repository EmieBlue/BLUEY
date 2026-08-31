import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';
import { supabase } from '@/lib/supabase';

/**
 * Uploads one comic page image to the PRIVATE `comics` bucket and returns its
 * object PATH. Goes through our same-origin function (`/api/comic-upload`) rather
 * than straight to Supabase Storage, so an ad-blocker can't drop the cross-origin
 * write to supabase.co (the same reason comments/reviews use `/api/*`). Accepts a
 * Blob (already-resized) or a uri; the session token is read here.
 */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/comic-upload`;
}

async function toBlob(source: string | Blob): Promise<Blob> {
  if (typeof source !== 'string') return source;
  const res = await fetch(source);
  return res.blob();
}

export async function uploadComicPage(source: string | Blob): Promise<{ path?: string; error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: 'Please sign in to upload.' };

    const blob = await toBlob(source);
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-access-token': token },
      body: blob,
    });
    const out = await res.json().catch(() => ({}) as { path?: string; error?: string });
    if (!res.ok || !out.path) return { error: out.error || 'Upload failed.' };
    return { path: out.path };
  } catch {
    return {
      error:
        'Couldn’t reach the server — an ad or privacy blocker may be in the way. Allow this site and try again.',
    };
  }
}
