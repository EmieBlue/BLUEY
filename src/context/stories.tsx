import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const { user, initializing } = useAuth();
  const userId = user?.id ?? null;
  // With no Supabase, use the local sample data immediately (demo mode).
  const [state, setState] = useState({
    userId,
    stories: isSupabaseConfigured ? [] as Story[] : STORIES,
    loading: isSupabaseConfigured,
    error: null as string | null,
  });
  const pending = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const source: Source = isSupabaseConfigured ? 'supabase' : 'local';
  // Never expose the previous account's drafts while a new session is loading.
  const sameUser = state.userId === userId;
  const stories = sameUser ? state.stories : [];
  const loading = isSupabaseConfigured && (initializing || !sameUser || state.loading);
  const error = sameUser ? state.error : null;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || initializing) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const id = ++requestId.current;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setState(previous => ({
      userId, stories: previous.userId === userId ? previous.stories : [], loading: true, error: null,
    }));
    // NB: chapter `paragraphs` is intentionally NOT selected — premium chapter
    // text is column-locked in the DB and only fetched (per chapter, gated by
    // purchase) via the `get_chapter_content` RPC in the reader.
    try {
      const { data, error: queryError } = await supabase
        .from('stories')
        .select(
          '*, author:authors(*), chapters(id,order,title,reading_minutes,is_premium,image_url,video_url,page_count)',
        ).abortSignal(controller.signal);
      if (id !== requestId.current) return;
      if (queryError || !Array.isArray(data)) throw queryError ?? new Error('Invalid catalogue response');
      setState({ userId, stories: mapStories(data as unknown as DbStory[]), loading: false, error: null });
    } catch {
      if (id !== requestId.current) return;
      setState(previous => ({
        ...previous, loading: false,
        error: 'We could not load your stories. Check your connection and try again.',
      }));
    } finally {
      clearTimeout(timeout);
      if (id === requestId.current) pending.current = null;
    }
  }, [userId, initializing]);

  useEffect(() => {
    load();
    return () => { requestId.current++; pending.current?.abort(); };
  }, [load]);

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
