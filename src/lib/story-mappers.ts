import type { Chapter, Genre, Story } from '@/data/types';

/**
 * Maps rows returned by Supabase (snake_case columns, with `author` and
 * `chapters` embedded) into the app's camelCase `Story`/`Chapter` types, so the
 * rest of the app stays unaware of the database shape.
 *
 * Query that produces these rows:
 *   supabase.from('stories').select(
 *     '*, author:authors(*), chapters(id,order,title,reading_minutes,is_premium,image_url,video_url)')
 *
 * NB: chapter `paragraphs` is intentionally absent from the list query — premium
 * text is column-locked in the DB and fetched (gated by purchase) via the
 * `get_chapter_content` RPC only in the reader/editor. So `paragraphs` here is
 * always `[]`; nothing in the list/home/detail views reads chapter text.
 */

interface DbAuthor {
  id: string;
  name: string;
  bio: string | null;
}

interface DbChapter {
  id: string;
  order: number;
  title: string;
  reading_minutes: number;
  is_premium: boolean;
  image_url: string | null;
  video_url: string | null;
  // Not selected by the list query (column-locked); only the reader/editor fetch
  // real paragraphs via the gated RPC. Optional so the list mapping type-checks.
  paragraphs?: string[] | null;
}

export interface DbStory {
  id: string;
  title: string;
  author_id: string | null;
  format: string;
  genres: string[] | null;
  blurb: string | null;
  description: string | null;
  cover_color: string | null;
  cover_emoji: string | null;
  is_complete: boolean;
  rating: number | null;
  reads_count: number | null;
  owner_id: string | null;
  cover_image_url: string | null;
  status: string | null;
  language: string | null;
  story_type: string | null;
  tags: string[] | null;
  copyright: string | null;
  is_mature: boolean | null;
  main_characters: string[] | null;
  target_audience: string | null;
  created_at: string | null;
  // Supabase returns a to-one embed as an object, but type it permissively.
  author: DbAuthor | DbAuthor[] | null;
  chapters: DbChapter[] | null;
}

function mapChapter(c: DbChapter): Chapter {
  return {
    id: c.id,
    order: c.order,
    title: c.title,
    readingMinutes: c.reading_minutes,
    isPremium: c.is_premium,
    imageUrl: c.image_url ?? undefined,
    videoUrl: c.video_url ?? undefined,
    paragraphs: c.paragraphs ?? [],
  };
}

export function mapStory(row: DbStory): Story {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  const chapters = (row.chapters ?? []).map(mapChapter).sort((a, b) => a.order - b.order);
  return {
    id: row.id,
    title: row.title,
    author: {
      id: author?.id ?? row.author_id ?? 'unknown',
      name: author?.name ?? 'Unknown author',
      bio: author?.bio ?? '',
    },
    format: row.format === 'serial' ? 'serial' : 'standalone',
    genres: (row.genres ?? []) as Genre[],
    blurb: row.blurb ?? '',
    description: row.description ?? '',
    coverColor: row.cover_color ?? '#3F5E5A',
    coverEmoji: row.cover_emoji ?? '📖',
    isComplete: row.is_complete,
    rating: row.rating ?? 0,
    readsCount: row.reads_count ?? 0,
    ownerId: row.owner_id ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    status: row.status === 'draft' ? 'draft' : 'published',
    createdAt: row.created_at ?? undefined,
    language: row.language ?? undefined,
    storyType: row.story_type ?? undefined,
    tags: row.tags ?? [],
    copyright: row.copyright ?? undefined,
    isMature: row.is_mature ?? false,
    mainCharacters: row.main_characters ?? [],
    targetAudience: row.target_audience ?? undefined,
    chapters,
  };
}

export function mapStories(rows: DbStory[]): Story[] {
  return rows.map(mapStory);
}
