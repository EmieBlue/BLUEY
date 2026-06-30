import type { Genre, StoryFormat } from '@/data/types';
import { supabase } from '@/lib/supabase';

/**
 * Publishes a story written in the app: upserts the author row, inserts the
 * story, and inserts its chapters into Supabase. Writing is gated by RLS to
 * authors who own the story (see supabase/authoring.sql).
 */

export interface ChapterDraft {
  title: string;
  body: string;
  isPremium: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

export interface StoryDraft {
  title: string;
  blurb: string;
  description: string;
  genres: Genre[];
  coverEmoji: string;
  coverColor: string;
  coverImageUrl?: string;
  format: StoryFormat;
  status?: 'draft' | 'published';
  language?: string;
  storyType?: string;
  tags?: string[];
  copyright?: string;
  isMature?: boolean;
  mainCharacters?: string[];
  targetAudience?: string;
  chapters: ChapterDraft[];
}

export interface PublishResult {
  storyId?: string;
  error?: string;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'story'
  );
}

/** Split pasted text into paragraphs (one per non-empty line/block). */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function readingMinutes(paragraphs: string[]): number {
  const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function publishStory(
  draft: StoryDraft,
  user: { id: string; displayName: string },
): Promise<PublishResult> {
  if (!supabase) return { error: 'Not connected to the database.' };

  const storyId = `${slugify(draft.title)}-${Math.random().toString(36).slice(2, 7)}`;

  // 1) Author row keyed by the user's id, so the existing author join works.
  const authorRes = await supabase
    .from('authors')
    .upsert({ id: user.id, name: user.displayName || 'Anonymous', bio: '' });
  if (authorRes.error) return { error: authorRes.error.message };

  // 2) Story row.
  const storyRes = await supabase.from('stories').insert({
    id: storyId,
    title: draft.title.trim(),
    author_id: user.id,
    owner_id: user.id,
    format: draft.format,
    genres: draft.genres,
    blurb: draft.blurb.trim(),
    description: draft.description.trim(),
    cover_color: draft.coverColor,
    cover_emoji: draft.coverEmoji || '📖',
    cover_image_url: draft.coverImageUrl ?? null,
    status: draft.status ?? 'published',
    language: draft.language ?? null,
    story_type: draft.storyType ?? null,
    tags: draft.tags ?? [],
    copyright: draft.copyright ?? null,
    is_mature: draft.isMature ?? false,
    main_characters: draft.mainCharacters ?? [],
    target_audience: draft.targetAudience ?? null,
    is_complete: draft.format === 'standalone',
    rating: 0,
    reads_count: 0,
  });
  if (storyRes.error) return { error: storyRes.error.message };

  // 3) Chapters (a story may start with none — parts can be added later).
  const rows = draft.chapters
    .filter((c) => c.body.trim() || c.title.trim())
    .map((c, i) => {
      const paragraphs = splitParagraphs(c.body);
      return {
        story_id: storyId,
        id: `ch${i + 1}`,
        order: i + 1,
        title: c.title.trim() || `Chapter ${i + 1}`,
        reading_minutes: readingMinutes(paragraphs),
        is_premium: c.isPremium,
        image_url: c.imageUrl ?? null,
        video_url: c.videoUrl ?? null,
        paragraphs,
      };
    });
  if (rows.length > 0) {
    const chaptersRes = await supabase.from('chapters').insert(rows);
    if (chaptersRes.error) return { error: chaptersRes.error.message };
  }

  return { storyId };
}

/** Publish a draft (or move back to draft). RLS allows only the owner. */
export async function setStoryStatus(
  storyId: string,
  status: 'draft' | 'published',
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  const { error } = await supabase.from('stories').update({ status }).eq('id', storyId);
  return error ? { error: error.message } : {};
}

/** Append one chapter to an existing story (next order). RLS allows only the owner. */
export async function addChapterToStory(
  storyId: string,
  chapter: ChapterDraft,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  const { data: last, error: qErr } = await supabase
    .from('chapters')
    .select('order')
    .eq('story_id', storyId)
    .order('order', { ascending: false })
    .limit(1);
  if (qErr) return { error: qErr.message };
  const nextOrder = ((last?.[0] as { order?: number } | undefined)?.order ?? 0) + 1;
  const paragraphs = splitParagraphs(chapter.body);
  const { error } = await supabase.from('chapters').insert({
    story_id: storyId,
    id: `c${Date.now().toString(36)}`,
    order: nextOrder,
    title: chapter.title.trim() || `Chapter ${nextOrder}`,
    reading_minutes: readingMinutes(paragraphs),
    is_premium: chapter.isPremium,
    image_url: chapter.imageUrl ?? null,
    video_url: chapter.videoUrl ?? null,
    paragraphs,
  });
  return error ? { error: error.message } : {};
}

/** Update an existing story's info (not its status). RLS allows only the owner. */
export async function updateStory(
  storyId: string,
  draft: StoryDraft,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  const { error } = await supabase
    .from('stories')
    .update({
      title: draft.title.trim(),
      blurb: draft.blurb.trim(),
      description: draft.description.trim(),
      genres: draft.genres,
      cover_color: draft.coverColor,
      cover_emoji: draft.coverEmoji || '',
      cover_image_url: draft.coverImageUrl ?? null,
      language: draft.language ?? null,
      story_type: draft.storyType ?? null,
      tags: draft.tags ?? [],
      copyright: draft.copyright ?? null,
      is_mature: draft.isMature ?? false,
      main_characters: draft.mainCharacters ?? [],
      target_audience: draft.targetAudience ?? null,
    })
    .eq('id', storyId);
  return error ? { error: error.message } : {};
}

/** Update an existing chapter's content. RLS allows only the owner. */
export async function updateChapter(
  storyId: string,
  chapterId: string,
  chapter: ChapterDraft,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Not connected to the database.' };
  const paragraphs = splitParagraphs(chapter.body);
  const { error } = await supabase
    .from('chapters')
    .update({
      title: chapter.title.trim() || 'Untitled',
      reading_minutes: readingMinutes(paragraphs),
      is_premium: chapter.isPremium,
      image_url: chapter.imageUrl ?? null,
      video_url: chapter.videoUrl ?? null,
      paragraphs,
    })
    .eq('story_id', storyId)
    .eq('id', chapterId);
  return error ? { error: error.message } : {};
}
