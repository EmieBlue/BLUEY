import { supabase } from '@/lib/supabase';

/**
 * Uploads a picked image (by uri) to the public `covers` Storage bucket and
 * returns its public URL. Works on web (blob:/data: uris) and native (file:).
 */
export async function uploadCover(
  uri: string,
  userId: string,
): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = blob.type?.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('covers').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });
    if (error) return { error: error.message };
    const { data } = supabase.storage.from('covers').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
