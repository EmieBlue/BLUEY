/**
 * Core data model for the app.
 *
 * For now these objects are served from local sample data (see `stories.ts`).
 * In a later phase the same shapes will be returned from Supabase, so screens
 * and components should only ever depend on these types — never on where the
 * data comes from.
 */

export type Genre =
  | 'Fantasy'
  | 'Romance'
  | 'Thriller'
  | 'Sci-Fi'
  | 'Mystery'
  | 'Literary';

export const ALL_GENRES: Genre[] = [
  'Fantasy',
  'Romance',
  'Thriller',
  'Sci-Fi',
  'Mystery',
  'Literary',
];

/** How a story is structured for the reader. */
export type StoryFormat =
  /** One complete, standalone piece read start to finish. */
  | 'standalone'
  /** A multi-chapter serial that the author updates over time. */
  | 'serial';

export interface Author {
  id: string;
  name: string;
  bio: string;
}

export interface Chapter {
  id: string;
  /** 1-based position within the story. */
  order: number;
  title: string;
  /** Estimated reading time in minutes, shown to readers. */
  readingMinutes: number;
  /**
   * Premium chapters require buying the book to read.
   * Free chapters are readable by anyone (used as a "taste" to convert readers).
   */
  isPremium: boolean;
  /** Optional media shown at the top of the chapter. */
  imageUrl?: string;
  /** Optional video link (e.g. YouTube) shown at the top of the chapter. */
  videoUrl?: string;
  /** The chapter body, one string per paragraph. */
  paragraphs: string[];
}

export interface Story {
  id: string;
  title: string;
  author: Author;
  format: StoryFormat;
  genres: Genre[];
  /** Short one-line pitch shown on cards. */
  blurb: string;
  /** Longer description shown on the story detail page. */
  description: string;
  /** Accent color for the auto-generated cover (hex). */
  coverColor: string;
  /** Emoji shown on the auto-generated cover. */
  coverEmoji: string;
  /** Serial only: whether the author has marked it finished. */
  isComplete: boolean;
  /** Average reader rating, 0–5 (0 when there are no ratings yet). */
  rating: number;
  /** How many readers have rated this book (0 = show "New" instead of stars). */
  ratingsCount: number;
  /** Total reads, used for "popular" sorting and social proof. */
  readsCount: number;
  /** Auth user id of the author who created it in-app (undefined for seeded samples). */
  ownerId?: string;
  /** Uploaded cover image URL; when set it's shown instead of the emoji+color cover. */
  coverImageUrl?: string;
  /** 'published' (public) or 'draft' (visible only to the owner). */
  status?: 'draft' | 'published';
  /** When the story was created (ISO), shown as the "Published" date. */
  createdAt?: string;
  // Wattpad-style story-info fields.
  language?: string;
  storyType?: string;
  tags?: string[];
  copyright?: string;
  isMature?: boolean;
  mainCharacters?: string[];
  targetAudience?: string;
  chapters: Chapter[];
}
