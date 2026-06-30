import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * App-wide reader state: subscription status, followed stories, and reading
 * progress.
 *
 * Two modes, transparently:
 *  - **Signed in + Supabase configured** → state is loaded from and written to
 *    the cloud (so it follows the reader across devices).
 *  - **Otherwise (demo/local)** → state lives in on-device storage.
 *
 * Screens consume the same hook either way; they don't know or care which mode
 * is active.
 */

const STORAGE_KEY = 'bluy.appState.v1';

/** storyId -> last chapterId the reader opened. */
type ProgressMap = Record<string, string>;

interface PersistedState {
  isSubscribed: boolean;
  /** Whether this account may write/publish stories. */
  isAuthor: boolean;
  followingIds: string[];
  progress: ProgressMap;
}

interface AppState extends PersistedState {
  /** False until state has loaded, so we don't flash the wrong UI. */
  hydrated: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  isFollowing: (storyId: string) => boolean;
  toggleFollow: (storyId: string) => void;
  getProgressChapterId: (storyId: string) => string | undefined;
  setProgress: (storyId: string, chapterId: string) => void;
}

const defaultPersisted: PersistedState = {
  isSubscribed: false,
  isAuthor: false,
  followingIds: [],
  progress: {},
};

const AppStateContext = createContext<AppState | null>(null);

async function loadFromCloud(userId: string): Promise<PersistedState> {
  if (!supabase) return defaultPersisted;
  const [profileRes, followsRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('is_subscribed, is_author').eq('id', userId).maybeSingle(),
    supabase.from('follows').select('story_id').eq('user_id', userId),
    supabase.from('reading_progress').select('story_id, chapter_id').eq('user_id', userId),
  ]);
  const progress: ProgressMap = {};
  for (const row of progressRes.data ?? []) {
    progress[row.story_id] = row.chapter_id;
  }
  return {
    isSubscribed: profileRes.data?.is_subscribed ?? false,
    isAuthor: profileRes.data?.is_author ?? false,
    followingIds: (followsRes.data ?? []).map((r) => r.story_id),
    progress,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { session, user, initializing } = useAuth();
  const userId = user?.id;
  const cloud = isSupabaseConfigured && Boolean(session);

  const [state, setState] = useState<PersistedState>(defaultPersisted);
  const [hydrated, setHydrated] = useState(false);

  // Load state whenever the mode or signed-in user changes.
  useEffect(() => {
    if (initializing) return; // wait for auth to settle first
    let active = true;
    setHydrated(false);

    if (cloud && userId) {
      loadFromCloud(userId)
        .then((data) => active && setState(data))
        .catch(() => {})
        .finally(() => active && setHydrated(true));
    } else {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((raw) => {
          if (!active) return;
          if (raw) {
            try {
              setState({ ...defaultPersisted, ...JSON.parse(raw) });
            } catch {
              setState(defaultPersisted);
            }
          } else {
            setState(defaultPersisted);
          }
        })
        .finally(() => active && setHydrated(true));
    }

    return () => {
      active = false;
    };
  }, [initializing, cloud, userId]);

  // After Stripe Checkout (web), we land back on `/?sub=success`. The webhook
  // flips is_subscribed server-side, but it can lag a second or two — so poll the
  // profile a few times until it shows premium, then clean the URL.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.location.search.includes('sub=success')) return;
    if (!cloud || !userId) return;

    let active = true;
    let tries = 0;
    const clearParam = () =>
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);

    const tick = async () => {
      if (!active) return;
      try {
        const data = await loadFromCloud(userId);
        if (!active) return;
        setState(data);
        if (data.isSubscribed) {
          clearParam();
          return;
        }
      } catch {
        // ignore and retry
      }
      if (++tries >= 5) {
        clearParam();
        return;
      }
      setTimeout(tick, 1500);
    };
    tick();

    return () => {
      active = false;
    };
  }, [cloud, userId]);

  // In local mode, persist every change to device storage.
  // (In cloud mode, Supabase is the source of truth — writes go there directly.)
  useEffect(() => {
    if (hydrated && !cloud) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, hydrated, cloud]);

  const setSubscribed = useCallback(
    (value: boolean) => {
      setState((s) => ({ ...s, isSubscribed: value }));
      if (cloud && supabase && userId) {
        supabase
          .from('profiles')
          .upsert({ id: userId, is_subscribed: value })
          .then(() => {});
      }
    },
    [cloud, userId],
  );

  const subscribe = useCallback(() => setSubscribed(true), [setSubscribed]);
  const unsubscribe = useCallback(() => setSubscribed(false), [setSubscribed]);

  const isFollowing = useCallback(
    (storyId: string) => state.followingIds.includes(storyId),
    [state.followingIds],
  );

  const toggleFollow = useCallback(
    (storyId: string) => {
      setState((s) => {
        const isOn = s.followingIds.includes(storyId);
        if (cloud && supabase && userId) {
          if (isOn) {
            supabase
              .from('follows')
              .delete()
              .eq('user_id', userId)
              .eq('story_id', storyId)
              .then(() => {});
          } else {
            supabase.from('follows').insert({ user_id: userId, story_id: storyId }).then(() => {});
          }
        }
        return {
          ...s,
          followingIds: isOn
            ? s.followingIds.filter((id) => id !== storyId)
            : [...s.followingIds, storyId],
        };
      });
    },
    [cloud, userId],
  );

  const getProgressChapterId = useCallback(
    (storyId: string) => state.progress[storyId],
    [state.progress],
  );

  const setProgress = useCallback(
    (storyId: string, chapterId: string) => {
      setState((s) => ({ ...s, progress: { ...s.progress, [storyId]: chapterId } }));
      if (cloud && supabase && userId) {
        supabase
          .from('reading_progress')
          .upsert(
            { user_id: userId, story_id: storyId, chapter_id: chapterId },
            { onConflict: 'user_id,story_id' },
          )
          .then(() => {});
      }
    },
    [cloud, userId],
  );

  const value = useMemo<AppState>(
    () => ({
      ...state,
      hydrated,
      subscribe,
      unsubscribe,
      isFollowing,
      toggleFollow,
      getProgressChapterId,
      setProgress,
    }),
    [state, hydrated, subscribe, unsubscribe, isFollowing, toggleFollow, getProgressChapterId, setProgress],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
