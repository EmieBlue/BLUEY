import { supabase } from '@/lib/supabase';

/**
 * Uploads one comic page image (by uri) to the PRIVATE `comics` Storage bucket
 * and returns its object PATH (not a public URL — the bucket is private). The
 * path is stored in the chapter's premium-gated `paragraphs`, and readers are
 * served the image only via short-lived signed URLs (functions/api/comic-pages.js).
 * The path starts with the user's id so the storage RLS policy allows the upload.
 */
export async function uploadComicPage(
  uri: string,
  userId: string,
): Promise<{ path?: string; error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = blob.type?.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('comics').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
