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
 * App-wide reader state: purchased books, followed stories, and reading
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
  /** Books this reader has bought (unlocked forever). */
  purchasedStoryIds: string[];
  /** Whether this account may write/publish stories. */
  isAuthor: boolean;
  followingIds: string[];
  progress: ProgressMap;
}

interface AppState extends PersistedState {
  /** False until state has loaded, so we don't flash the wrong UI. */
  hydrated: boolean;
  hasPurchased: (storyId: string) => boolean;
  purchaseBook: (storyId: string) => void;
  isFollowing: (storyId: string) => boolean;
  toggleFollow: (storyId: string) => void;
  getProgressChapterId: (storyId: string) => string | undefined;
  setProgress: (storyId: string, chapterId: string) => void;
}

const defaultPersisted: PersistedState = {
  purchasedStoryIds: [],
  isAuthor: false,
  followingIds: [],
  progress: {},
};

const AppStateContext = createContext<AppState | null>(null);

async function loadFromCloud(userId: string): Promise<PersistedState> {
  if (!supabase) return defaultPersisted;
  const [profileRes, followsRes, progressRes, purchasesRes] = await Promise.all([
    supabase.from('profiles').select('is_author').eq('id', userId).maybeSingle(),
    supabase.from('follows').select('story_id').eq('user_id', userId),
    supabase.from('reading_progress').select('story_id, chapter_id').eq('user_id', userId),
    supabase.from('purchases').select('story_id').eq('user_id', userId),
  ]);
  const progress: ProgressMap = {};
  for (const row of progressRes.data ?? []) {
    progress[row.story_id] = row.chapter_id;
  }
  return {
    purchasedStoryIds: (purchasesRes.data ?? []).map((r) => r.story_id),
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

  // After Paystack Checkout (web), we land back on `/?purchase=success&story=<id>`.
  // The webhook records the purchase server-side, but it can lag a second or two —
  // so poll a few times until this book shows as owned, then clean the URL.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') !== 'success') return;
    if (!cloud || !userId) return;

    const boughtStoryId = params.get('story');
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
        if (!boughtStoryId || data.purchasedStoryIds.includes(boughtStoryId)) {
          clearParam();
          return;
        }
      } catch {
        // ignore and retry
      }
      if (++tries >= 6) {
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

  const hasPurchased = useCallback(
    (storyId: string) => state.purchasedStoryIds.includes(storyId),
    [state.purchasedStoryIds],
  );

  // Demo/local mode only: unlock a book on-device. In cloud mode the purchase is
  // recorded by the Paystack webhook after payment, then loaded via loadFromCloud.
  const purchaseBook = useCallback((storyId: string) => {
    setState((s) =>
      s.purchasedStoryIds.includes(storyId)
        ? s
        : { ...s, purchasedStoryIds: [...s.purchasedStoryIds, storyId] },
    );
  }, []);

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
      hasPurchased,
      purchaseBook,
      isFollowing,
      toggleFollow,
      getProgressChapterId,
      setProgress,
    }),
    [state, hydrated, hasPurchased, purchaseBook, isFollowing, toggleFollow, getProgressChapterId, setProgress],
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
