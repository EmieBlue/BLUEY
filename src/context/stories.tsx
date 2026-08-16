import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/auth';
import {
  STORIES,
  getAdjacentChapter as adjacentChapter,
  getChapter as chapterOf,
  getFeaturedStory as featuredOf,
  getPopularStories as popularOf,
  getStoryById as storyById,
  searchStories as searchOf,
} from '@/data/stories';
import type { Chapter, Story } from '@/data/types';
import { mapStories, type DbStory } from '@/lib/story-mappers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Source = 'supabase' | 'local';

interface StoriesData {
  stories: Story[];
  loading: boolean;
  error: string | null;
  /** Where the currently-loaded stories came from. */
  source: Source;
  getStoryById: (id: string) => Story | undefined;
  getChapter: (
    storyId: string,
    chapterId: string,
  ) => { story: Story; chapter: Chapter } | undefined;
  getAdjacentChapter: (
    storyId: string,
    chapterId: string,
    direction: 'next' | 'prev',
  ) => Chapter | undefined;
  getFeaturedStory: () => Story | undefined;
  getPopularStories: () => Story[];
  searchStories: (query: string) => Story[];
  /** Re-fetch stories from Supabase (e.g. after publishing a new one). */
  refresh: () => Promise<void>;
}

const StoriesContext = createContext<StoriesData | null>(null);

export function StoriesProvider({ children }: { children: ReactNode }) {
  // Re-fetch when the signed-in user changes: draft stories are only readable by
  // their owner (RLS), so the list must reload once a session is established or
  // the author's own drafts never appear.
  const { user } = useAuth();
  // With no Supabase, use the local sample data immediately (demo mode).
  const [stories, setStories] = useState<Story[]>(isSupabaseConfigured ? [] : STORIES);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(isSupabaseConfigured ? 'supabase' : 'local');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return; // local fallback already in place
    setLoading(true);
    // NB: chapter `paragraphs` is intentionally NOT selected — premium chapter
    // text is column-locked in the DB and only fetched (per chapter, gated by
    // purchase) via the `get_chapter_content` RPC in the reader.
    const { data, error: queryError } = await supabase
      .from('stories')
      .select(
        '*, author:authors(*), chapters(id,order,title,reading_minutes,is_premium,image_url,video_url)',
      );
    if (queryError || !data || data.length === 0) {
      // Never show a blank app: fall back to the bundled sample stories.
      setError(queryError ? queryError.message : null);
      setStories(STORIES);
      setSource('local');
    } else {
      setError(null);
      setStories(mapStories(data as unknown as DbStory[]));
      setSource('supabase');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const value = useMemo<StoriesData>(
    () => ({
      stories,
      loading,
      error,
      source,
      getStoryById: (id) => storyById(stories, id),
      getChapter: (storyId, chapterId) => chapterOf(stories, storyId, chapterId),
      getAdjacentChapter: (storyId, chapterId, direction) =>
        adjacentChapter(stories, storyId, chapterId, direction),
      getFeaturedStory: () => featuredOf(stories),
      getPopularStories: () => popularOf(stories),
      searchStories: (query) => searchOf(stories, query),
      refresh: load,
    }),
    [stories, loading, error, source, load],
  );

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
}

export function useStoriesData(): StoriesData {
  const ctx = useContext(StoriesContext);
  if (!ctx) {
    throw new Error('useStoriesData must be used within a StoriesProvider');
  }
  return ctx;
}
