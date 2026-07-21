import type { Chapter, Genre, Story } from './types';

/**
 * Local fallback content. Supabase is the source of truth for stories (loaded by
 * the StoriesProvider); this array is only shown if the database is empty or
 * unreachable. It is intentionally EMPTY — real stories live in Supabase and are
 * added through the app's Write feature — so a clean database never falls back to
 * demo data. The accessor functions below operate on whichever array is loaded.
 */
export const STORIES: Story[] = [];

// --- Pure lookups over a stories array --------------------------------------
// The StoriesProvider loads the array (from Supabase, or the local STORIES
// fallback) and binds these. Screens call the bound versions via
// useStoriesData() instead of importing these directly.

export function getStoryById(stories: Story[], id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}

export function getChapter(
  stories: Story[],
  storyId: string,
  chapterId: string,
): { story: Story; chapter: Chapter } | undefined {
  const story = getStoryById(stories, storyId);
  if (!story) return undefined;
  const chapter = story.chapters.find((c) => c.id === chapterId);
  if (!chapter) return undefined;
  return { story, chapter };
}

/** The single hero story shown at the top of Home (undefined if there are none). */
export function getFeaturedStory(stories: Story[]): Story | undefined {
  return stories[0];
}

export function getPopularStories(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => b.readsCount - a.readsCount);
}

export function getStoriesByGenre(stories: Story[], genre: Genre): Story[] {
  return stories.filter((s) => s.genres.includes(genre));
}

export function searchStories(stories: Story[], query: string): Story[] {
  const q = query.trim().toLowerCase();
  if (!q) return stories;
  return stories.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.author.name.toLowerCase().includes(q) ||
      s.blurb.toLowerCase().includes(q) ||
      s.genres.some((g) => g.toLowerCase().includes(q)),
  );
}

/** The chapter before/after the given one, or undefined at the ends. */
export function getAdjacentChapter(
  stories: Story[],
  storyId: string,
  chapterId: string,
  direction: 'next' | 'prev',
): Chapter | undefined {
  const story = getStoryById(stories, storyId);
  if (!story) return undefined;
  const index = story.chapters.findIndex((c) => c.id === chapterId);
  if (index === -1) return undefined;
  const target = direction === 'next' ? index + 1 : index - 1;
  return story.chapters[target];
}

export function hasPremiumChapters(story: Story): boolean {
  return story.chapters.some((c) => c.isPremium);
}

/** Human-friendly reads count, e.g. 18420 -> "18.4k". */
export function formatReads(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}
