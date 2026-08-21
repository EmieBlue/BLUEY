import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';
import { supabase } from '@/lib/supabase';

/**
 * Book ratings & reviews. Like comments, these go through our own hosted function
 * (`/api/reviews`, a Cloudflare Pages Function) rather than straight to Supabase,
 * so ad-blockers that drop cross-origin writes to supabase.co don't break them.
 * Reading is public; writing forwards the user's session token so RLS is enforced
 * server-side (see functions/api/reviews.js). One review per reader per book.
 */

export interface Review {
  userId: string;
  storyId: string;
  rating: number;
  authorName: string;
  body: string;
  createdAt: string;
}

interface ReviewRow {
  user_id: string;
  story_id: string;
  rating: number;
  author_name: string | null;
  body: string | null;
  created_at: string;
}

function mapRow(r: ReviewRow): Review {
  return {
    userId: r.user_id,
    storyId: r.story_id,
    rating: r.rating,
    authorName: r.author_name?.trim() || 'Reader',
    body: r.body ?? '',
    createdAt: r.created_at,
  };
}

/** Same-origin on web (first-party, not ad-blocked); SITE_URL on native. */
function endpoint(): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/reviews`;
}

async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}

/** All reviews for a book, newest first. `failed` distinguishes a load error
 * (network / blocker) from a book that simply has no reviews yet. */
export async function fetchReviews(
  storyId: string,
): Promise<{ reviews: Review[]; failed: boolean }> {
  try {
    const url = `${endpoint()}?story_id=${encodeURIComponent(storyId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}) as { reviews?: ReviewRow[] });
    if (!res.ok || !Array.isArray(data.reviews)) return { reviews: [], failed: true };
    return { reviews: data.reviews.map(mapRow), failed: false };
  } catch {
    return { reviews: [], failed: true };
  }
}

/** Create or update the signed-in reader's review for a book. */
export async function submitReview(params: {
  storyId: string;
  rating: number;
  body?: string;
}): Promise<{ review?: Review; error?: string }> {
  if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
    return { error: 'Tap a star rating first.' };
  }
  const token = await accessToken();
  if (!token) return { error: 'Please sign in to leave a rating.' };
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: params.storyId,
        rating: params.rating,
        body: params.body ?? '',
        accessToken: token,
      }),
    });
    const data = await res.json().catch(() => ({}) as { review?: ReviewRow; error?: string });
    if (!res.ok || !data.review) return { error: data.error || 'Could not save your review.' };
    return { review: mapRow(data.review) };
  } catch {
    return {
      error:
        'Couldn’t reach the server — an ad or privacy blocker may be in the way. Allow this site and try again.',
    };
  }
}

/** Delete a review — your own, or (as the book's author) anyone's for moderation. */
export async function deleteReview(
  storyId: string,
  targetUserId?: string,
): Promise<{ error?: string }> {
  const token = await accessToken();
  if (!token) return { error: 'Please sign in.' };
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', storyId, targetUserId, accessToken: token }),
    });
    const data = await res.json().catch(() => ({}) as { error?: string });
    if (!res.ok) return { error: data.error || 'Could not delete.' };
    return {};
  } catch {
    return { error: 'Couldn’t reach the server — a blocker may be in the way. Allow this site and try again.' };
  }
}
