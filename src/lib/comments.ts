import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';
import { supabase } from '@/lib/supabase';

/**
 * Per-chapter comments. These go through our own Netlify function
 * (`/.netlify/functions/notes`), NOT straight to Supabase: ad-blockers / privacy
 * shields drop cross-origin writes to supabase.co, which broke posting with
 * "TypeError: Failed to fetch". A first-party same-origin call isn't blocked.
 * Reading is public; posting/deleting forward the user's session token so RLS is
 * still enforced server-side (see netlify/functions/notes.mjs).
 */

export interface Comment {
  id: string;
  storyId: string;
  chapterId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  story_id: string;
  chapter_id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

function mapRow(r: CommentRow): Comment {
  return {
    id: r.id,
    storyId: r.story_id,
    chapterId: r.chapter_id,
    userId: r.user_id,
    authorName: r.author_name?.trim() || 'Reader',
    body: r.body,
    createdAt: r.created_at,
  };
}

/** Same-origin on web (so it's first-party, not ad-blocked); SITE_URL on native. */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/.netlify/functions/notes`;
}

async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}

/**
 * All comments on a chapter, oldest first. `failed` is true when the request
 * itself couldn't complete (network / a content blocker), so the UI can tell a
 * real load failure apart from a chapter that genuinely has no comments yet.
 */
export async function fetchComments(
  storyId: string,
  chapterId: string,
): Promise<{ comments: Comment[]; failed: boolean }> {
  try {
    const url = `${endpoint()}?story_id=${encodeURIComponent(storyId)}&chapter_id=${encodeURIComponent(chapterId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}) as { notes?: CommentRow[] });
    if (!res.ok || !Array.isArray(data.notes)) return { comments: [], failed: true };
    return { comments: data.notes.map(mapRow), failed: false };
  } catch {
    return { comments: [], failed: true };
  }
}

/** Post a comment. Returns the created row so the caller can append it. */
export async function addComment(params: {
  storyId: string;
  chapterId: string;
  body: string;
}): Promise<{ comment?: Comment; error?: string }> {
  const body = params.body.trim();
  if (!body) return { error: 'Write something first.' };
  const token = await accessToken();
  if (!token) return { error: 'Please sign in to comment.' };
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: params.storyId, chapterId: params.chapterId, body, accessToken: token }),
    });
    const data = await res.json().catch(() => ({}) as { note?: CommentRow; error?: string });
    if (!res.ok || !data.note) return { error: data.error || 'Could not post your comment.' };
    return { comment: mapRow(data.note) };
  } catch {
    return {
      error: 'Couldn’t reach the server — an ad or privacy blocker may be blocking comments. Allow this site in your blocker and try again.',
    };
  }
}

/** Delete a comment (server enforces: own comment, or any on a story you authored). */
export async function deleteComment(id: string): Promise<{ error?: string }> {
  const token = await accessToken();
  if (!token) return { error: 'Please sign in.' };
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, accessToken: token }),
    });
    const data = await res.json().catch(() => ({}) as { error?: string });
    if (!res.ok) return { error: data.error || 'Could not delete.' };
    return {};
  } catch {
    return { error: 'Couldn’t reach the server — a blocker may be in the way. Allow this site and try again.' };
  }
}
