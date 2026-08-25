import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentsSection } from '@/components/comments-section';
import { LoadingView } from '@/components/loading-view';
import { NaturalImage } from '@/components/natural-image';
import { StoryCover } from '@/components/story-cover';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME } from '@/config/app';
import { Fonts, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import { isChapterGated } from '@/data/stories';
import type { Chapter } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { fetchComicPages } from '@/lib/comic';
import { supabase } from '@/lib/supabase';
import { getChapterAudioUrl } from '@/lib/tts';

const READING_WIDTH = 720;

const posKey = (id: string) => 'bluey.pos.' + id;
const fmtTime = (s?: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(t / 60);
  const ss = t % 60;
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
};

const countWords = (paras: string[]) => paras.join(' ').trim().split(/\s+/).filter(Boolean).length;
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

export default function ReaderScreen() {
  const { storyId, chapterId, autoplay, autoadvance } = useLocalSearchParams<{
    storyId: string;
    chapterId: string;
    autoplay?: string;
    autoadvance?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const { hasPurchased, setProgress } = useAppState();
  const { user, initializing } = useAuth();
  const { loading, getChapter, getAdjacentChapter } = useStoriesData();

  const [rate, setRate] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(autoadvance === '1');
  const [menuOpen, setMenuOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [barW, setBarW] = useState(0);
  // Chapter text is fetched separately, through a purchase-gated RPC — it is NOT
  // in the loaded story list (premium paragraphs are column-locked in the DB).
  const [content, setContent] = useState<string[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  // Comic books: page image URLs (signed), fetched instead of text.
  const [comicPages, setComicPages] = useState<string[] | null>(null);
  const autoStartedRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<number | null>(null); // resume position to seek to once loaded
  const lastSaveRef = useRef(0);

  // Natural narration: one cached mp3 per chapter, played via expo-audio.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  const result = getChapter(storyId, chapterId);
  const isOwner = !!user && result?.story.ownerId === user.id;
  const hasAccess = result ? hasPurchased(result.story.id) || isOwner : false;
  // Gated = this chapter is at or after the book's first premium chapter (so a
  // free chapter placed after a locked one can't be used to skip the paywall).
  const locked = result ? isChapterGated(result.story, result.chapter) && !hasAccess : false;
  const isComic = result?.story.kind === 'comic';

  // Remember where the reader got to (only once we know it's readable).
  useEffect(() => {
    if (result && !locked) {
      setProgress(storyId, chapterId);
    }
  }, [result, locked, storyId, chapterId, setProgress]);

  // New chapter → forget the old audio and stop playing.
  useEffect(() => {
    setAudioReady(false);
    setAudioError(null);
    setPreparing(false);
    try {
      player.pause();
    } catch {
      /* player may not be ready */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // Fetch the chapter's text through the purchase-gated `get_chapter_content`
  // RPC. The list query never carries premium paragraphs, so the reader asks the
  // server for the text only once the chapter is actually readable (free / owned
  // / purchased). A locked chapter never fetches — the paywall shows instead.
  useEffect(() => {
    if (!result || locked || !user) {
      setContent(null);
      setComicPages(null);
      return;
    }
    let cancelled = false;
    setContentLoading(true);
    setContent(null);
    setComicPages(null);
    (async () => {
      // Comic → fetch signed page-image URLs (gated the same way as text).
      if (isComic) {
        const res = await fetchComicPages(storyId, chapterId);
        if (cancelled) return;
        setComicPages(res.pages);
        setContentLoading(false);
        return;
      }
      if (!supabase) {
        // Demo / no-Supabase mode: fall back to any locally-bundled paragraphs.
        if (!cancelled) {
          setContent(result.chapter.paragraphs ?? []);
          setContentLoading(false);
        }
        return;
      }
      const { data, error } = await supabase.rpc('get_chapter_content', {
        p_story_id: storyId,
        p_chapter_id: chapterId,
      });
      if (cancelled) return;
      setContent(error ? [] : ((data as string[] | null) ?? []));
      setContentLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.chapter.id, storyId, chapterId, locked, user?.id, isComic]);

  const handleEnd = () => {
    if (!result) return;
    const nx = getAdjacentChapter(result.story.id, result.chapter.id, 'next');
    if (autoAdvance && nx && !(isChapterGated(result.story, nx) && !hasAccess)) {
      router.replace({
        pathname: '/reader/[storyId]/[chapterId]',
        params: { storyId: result.story.id, chapterId: nx.id, autoplay: '1', autoadvance: '1' },
      });
    }
  };

  // When narration finishes: repeat the chapter, or auto-advance.
  useEffect(() => {
    if (!status.didJustFinish) return;
    AsyncStorage.removeItem(posKey(chapterId)).catch(() => {});
    if (repeat) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        /* ignore */
      }
    } else {
      handleEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Once the freshly-loaded track is ready, jump to the saved resume position.
  useEffect(() => {
    if (status.isLoaded && pendingSeekRef.current != null) {
      const to = pendingSeekRef.current;
      pendingSeekRef.current = null;
      if (to > 2 && (!status.duration || to < status.duration - 3)) {
        try {
          player.seekTo(to);
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded]);

  // While playing, remember the position every few seconds (so "continue where
  // you left off" survives leaving the chapter or closing the app).
  useEffect(() => {
    if (!playing) return;
    const now = Date.now();
    if (now - lastSaveRef.current > 4000 && (status.currentTime || 0) > 1) {
      lastSaveRef.current = now;
      AsyncStorage.setItem(posKey(chapterId), String(status.currentTime)).catch(() => {});
    }
  }, [status.currentTime, playing, chapterId]);

  const prepareAndPlay = async () => {
    if (!result) return;
    if (audioReady) {
      player.play();
      return;
    }
    const paras = content ?? [];
    if (!paras.length) return;
    setAudioError(null);
    setPreparing(true);
    const res = await getChapterAudioUrl({
      chapterId,
      text: paras.join('\n\n'),
      genre: result.story.genres?.[0],
    });
    setPreparing(false);
    if (res.error || !res.url) {
      setAudioError(res.error || 'Could not prepare narration.');
      return;
    }
    let savedPos = 0;
    try {
      const raw = await AsyncStorage.getItem(posKey(chapterId));
      if (raw) savedPos = parseFloat(raw) || 0;
    } catch {
      /* ignore */
    }
    try {
      player.replace(res.url);
      player.playbackRate = rate;
      pendingSeekRef.current = savedPos; // seeked once the track loads
      player.play();
      setAudioReady(true);
    } catch {
      setAudioError('Could not play the narration.');
    }
  };

  const seekBy = (delta: number) => {
    const d = status.duration || 0;
    const to = Math.max(0, Math.min(d ? d - 0.5 : (status.currentTime || 0) + delta, (status.currentTime || 0) + delta));
    try {
      player.seekTo(to);
    } catch {
      /* ignore */
    }
  };

  const seekToFraction = (f: number) => {
    const d = status.duration || 0;
    if (!d || !isFinite(f)) return;
    try {
      player.seekTo(Math.max(0, Math.min(d, f * d)));
    } catch {
      /* ignore */
    }
  };

  // Auto-start reading when arriving via auto-advance (autoplay=1).
  useEffect(() => {
    if (autoplay === '1' && result && !locked && autoStartedRef.current !== chapterId) {
      autoStartedRef.current = chapterId;
      prepareAndPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, autoplay, loading, locked]);

  const toggleListen = () => {
    if (playing) {
      player.pause();
      if ((status.currentTime || 0) > 1) {
        AsyncStorage.setItem(posKey(chapterId), String(status.currentTime)).catch(() => {});
      }
      return;
    }
    prepareAndPlay();
  };

  const changeRate = (r: number) => {
    setRate(r);
    try {
      player.playbackRate = r;
    } catch {
      /* ignore */
    }
  };

  if (loading || initializing) return <LoadingView />;

  if (!result) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Chapter not found.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // Reading requires an account: browsing is open, but opening a chapter asks
  // signed-out visitors to sign in / create a free account first.
  if (!user) {
    return (
      <SignInGate
        title={result.story.title}
        onSignIn={() => router.push('/auth')}
        onBack={() => router.back()}
      />
    );
  }

  const { story, chapter } = result;

  const goToChapter = (target: Chapter | undefined) => {
    if (!target) return;
    if (isChapterGated(story, target) && !hasAccess) {
      router.push({ pathname: '/paywall', params: { storyId: story.id } });
      return;
    }
    router.replace({
      pathname: '/reader/[storyId]/[chapterId]',
      params: { storyId: story.id, chapterId: target.id },
    });
  };

  const prev = getAdjacentChapter(story.id, chapter.id, 'prev');
  const next = getAdjacentChapter(story.id, chapter.id, 'next');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
          {story.chapters.length > 1 ? (
            <Pressable onPress={() => setMenuOpen(true)} style={styles.headerTitleBtn} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.headerTitleText}>
                {story.title}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.headerTitle}>
              {story.title}
            </ThemedText>
          )}
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>

      {locked ? (
        <LockedView
          onUnlock={() => router.push({ pathname: '/paywall', params: { storyId: story.id } })}
          chapterTitle={chapter.title}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.reading}>
            <View style={styles.chapterHeader}>
              <StoryCover story={story} width={96} height={138} showTitle={false} radius={10} />
              {story.format === 'serial' && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.chapterKicker}>
                  Chapter {chapter.order}
                </ThemedText>
              )}
              <ThemedText style={styles.chapterTitle}>{chapter.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.chapterMeta}>
                {[
                  'Published',
                  fmtDate(story.createdAt),
                  isComic
                    ? chapter.pageCount
                      ? `${chapter.pageCount} pages`
                      : null
                    : content && content.length
                      ? `${countWords(content).toLocaleString()} words`
                      : null,
                  isComic ? null : `${chapter.readingMinutes} min read`,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                by {story.author.name}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

            {!isComic && (
            <View style={[styles.audioPanel, { borderColor: theme.backgroundElement }]}>
              <View style={styles.audioTopRow}>
                <Pressable
                  onPress={toggleListen}
                  disabled={preparing}
                  style={[styles.listenBtn, { backgroundColor: theme.accent, opacity: preparing ? 0.7 : 1 }]}>
                  {preparing ? (
                    <ActivityIndicator size="small" color={theme.accentOn} />
                  ) : (
                    <Ionicons
                      name={playing ? 'pause' : 'volume-high'}
                      size={18}
                      color={theme.accentOn}
                    />
                  )}
                  <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                    {preparing ? 'Preparing…' : playing ? 'Pause' : audioReady ? 'Resume' : 'Listen'}
                  </ThemedText>
                </Pressable>
                <View style={styles.autoRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Auto-play next
                  </ThemedText>
                  <Switch
                    value={autoAdvance}
                    onValueChange={setAutoAdvance}
                    trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                  />
                </View>
              </View>

              {audioReady && (
                <>
                  <View style={styles.progressRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                      {fmtTime(status.currentTime)}
                    </ThemedText>
                    <Pressable
                      style={styles.progressTrack}
                      onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
                      onPress={(e) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const x = (e.nativeEvent as any).locationX;
                        if (barW > 0 && typeof x === 'number') seekToFraction(x / barW);
                      }}>
                      <View style={[styles.progressBg, { backgroundColor: theme.backgroundElement }]} />
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: theme.accent,
                            width: `${status.duration ? Math.min(100, ((status.currentTime || 0) / status.duration) * 100) : 0}%`,
                          },
                        ]}
                      />
                    </Pressable>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                      {fmtTime(status.duration)}
                    </ThemedText>
                  </View>

                  <View style={styles.transportRow}>
                    <Pressable
                      onPress={() => seekBy(-15)}
                      style={[styles.transportBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="play-back" size={16} color={theme.text} />
                      <ThemedText type="small" style={{ color: theme.text }}>
                        15s
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => seekBy(15)}
                      style={[styles.transportBtn, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="small" style={{ color: theme.text }}>
                        15s
                      </ThemedText>
                      <Ionicons name="play-forward" size={16} color={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => setRepeat((v) => !v)}
                      style={[
                        styles.transportBtn,
                        { backgroundColor: repeat ? theme.accent : theme.backgroundElement },
                      ]}>
                      <Ionicons name="repeat" size={16} color={repeat ? theme.accentOn : theme.text} />
                      <ThemedText type="small" style={{ color: repeat ? theme.accentOn : theme.text }}>
                        Repeat
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              )}

              <View style={styles.audioCtrlRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Speed
                </ThemedText>
                {[0.75, 1, 1.25, 1.5].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => changeRate(r)}
                    style={[
                      styles.speedChip,
                      { backgroundColor: rate === r ? theme.accent : theme.backgroundElement },
                    ]}>
                    <ThemedText type="small" style={{ color: rate === r ? theme.accentOn : theme.text }}>
                      {r}x
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {audioError ? (
                <ThemedText type="small" style={{ color: '#FF8A80' }}>
                  {audioError}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  🎧 Natural narration, matched to this story’s mood.
                </ThemedText>
              )}
            </View>
            )}

            {!isComic && chapter.imageUrl ? (
              <NaturalImage uri={chapter.imageUrl} style={styles.chapterImage} />
            ) : null}
            {!isComic && chapter.videoUrl ? <ChapterVideo url={chapter.videoUrl} /> : null}

            {contentLoading ? (
              <ActivityIndicator style={{ marginVertical: Spacing.six }} color={theme.accent} />
            ) : isComic ? (
              comicPages && comicPages.length > 0 ? (
                comicPages.map((uri, i) => (
                  <NaturalImage key={i} uri={uri} radius={0} style={styles.comicPage} />
                ))
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.paragraph}>
                  This chapter isn’t available to read yet.
                </ThemedText>
              )
            ) : content && content.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.paragraph}>
                This chapter isn’t available to read yet.
              </ThemedText>
            ) : (
              (content ?? []).map((para, i) => (
                <ThemedText key={i} style={styles.paragraph}>
                  {para}
                </ThemedText>
              ))
            )}

            {/* Prev / next navigation */}
            <View style={styles.navRow}>
              <NavButton
                label="Previous"
                icon="arrow-back"
                disabled={!prev}
                onPress={() => goToChapter(prev)}
              />
              <NavButton
                label={next ? 'Next chapter' : 'The end'}
                icon="arrow-forward"
                iconRight
                disabled={!next}
                onPress={() => goToChapter(next)}
              />
            </View>

            <CommentsSection storyId={story.id} chapterId={chapter.id} canModerate={isOwner} />
          </View>
        </ScrollView>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.menuPanel,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
            ]}
            onPress={() => {}}>
            <ThemedText style={styles.menuTitle}>
              {story.chapters.length} {story.chapters.length === 1 ? 'part' : 'parts'}
            </ThemedText>
            <ScrollView style={styles.menuList}>
              {story.chapters.map((c) => {
                const isCurrent = c.id === chapter.id;
                const chLocked = isChapterGated(story, c) && !hasAccess;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setMenuOpen(false);
                      goToChapter(c);
                    }}
                    style={[
                      styles.menuRow,
                      {
                        borderColor: theme.backgroundElement,
                        backgroundColor: isCurrent ? theme.backgroundElement : 'transparent',
                      },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {story.format === 'serial' ? `Chapter ${c.order}: ${c.title}` : c.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {c.readingMinutes} min read{chLocked ? ' · Premium' : ''}
                      </ThemedText>
                    </View>
                    {isCurrent ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                    ) : chLocked ? (
                      <Ionicons name="lock-closed" size={16} color="#F5A623" />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function youTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function ChapterVideo({ url }: { url: string }) {
  const theme = useTheme();
  const embed = youTubeEmbed(url);
  if (Platform.OS === 'web' && embed) {
    // On web, embed the player inline (RN Web renders the 'iframe' host element).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createElement('iframe' as any, {
      src: embed,
      title: 'Chapter video',
      allowFullScreen: true,
      style: { width: '100%', height: 240, border: 0, borderRadius: 12, marginBottom: 16 },
    });
  }
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[styles.videoBtn, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="logo-youtube" size={20} color="#FF0000" />
      <ThemedText type="smallBold">Watch video</ThemedText>
    </Pressable>
  );
}

function NavButton({
  label,
  icon,
  iconRight,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.navBtn,
        {
          backgroundColor: theme.backgroundElement,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}>
      {!iconRight && <Ionicons name={icon} size={16} color={theme.text} />}
      <ThemedText type="smallBold">{label}</ThemedText>
      {iconRight && <Ionicons name={icon} size={16} color={theme.text} />}
    </Pressable>
  );
}

function LockedView({
  chapterTitle,
  onUnlock,
}: {
  chapterTitle: string;
  onUnlock: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.locked}>
      <Ionicons name="lock-closed" size={48} color="#F5A623" />
      <ThemedText style={styles.lockedTitle}>“{chapterTitle}” is premium</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.lockedText}>
        Buy this book once to unlock this chapter and every other premium chapter on {APP_NAME}.
      </ThemedText>
      <Pressable
        onPress={onUnlock}
        style={({ pressed }) => [
          styles.lockedCta,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={[styles.lockedCtaText, { color: theme.accentOn }]}>
          Unlock this book
        </ThemedText>
      </Pressable>
    </View>
  );
}

function SignInGate({
  title,
  onSignIn,
  onBack,
}: {
  title: string;
  onSignIn: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
        <View style={styles.headerBar}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>
      <View style={styles.locked}>
        <Ionicons name="lock-closed" size={44} color={theme.accent} />
        <ThemedText style={styles.lockedTitle}>Sign in to read</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lockedText}>
          Create a free account (or sign in) to start reading “{title}” on {APP_NAME}.
        </ThemedText>
        <Pressable
          onPress={onSignIn}
          style={({ pressed }) => [
            styles.lockedCta,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText style={[styles.lockedCtaText, { color: theme.accentOn }]}>
            Sign in / Create account
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  safeAreaTop: { width: '100%' },
  headerBar: {
    width: '100%',
    maxWidth: READING_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: Spacing.two },
  headerTitleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: Spacing.two,
  },
  headerTitleText: { flexShrink: 1 },
  scroll: { alignItems: 'center', paddingBottom: Spacing.six },
  reading: {
    width: '100%',
    maxWidth: READING_WIDTH,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  chapterHeader: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  chapterKicker: { textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.two },
  chapterTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  chapterMeta: { textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginBottom: Spacing.four },
  byline: { marginTop: Spacing.two, marginBottom: Spacing.three },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  audioPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  audioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  audioCtrlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timeText: { width: 42, textAlign: 'center' },
  progressTrack: { flex: 1, height: 24, justifyContent: 'center' },
  progressBg: { position: 'absolute', left: 0, right: 0, height: 5, borderRadius: 999 },
  progressFill: { position: 'absolute', left: 0, height: 5, borderRadius: 999 },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  transportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 999,
  },
  speedChip: { paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: 999, maxWidth: 220 },
  voiceGroup: { gap: Spacing.two },
  voiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chapterImage: { marginBottom: Spacing.four },
  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    marginBottom: Spacing.four,
  },
  paragraph: {
    fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : Fonts?.serif,
    fontSize: 19,
    lineHeight: 33,
    marginBottom: 20,
  },
  comicPage: { marginBottom: 0 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: 12,
  },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  lockedTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  lockedText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  lockedCta: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  lockedCtaText: { fontSize: 16, fontWeight: '800' },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: Spacing.three,
  },
  menuPanel: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  menuTitle: { fontSize: 16, fontWeight: '800', marginBottom: Spacing.one },
  menuList: { maxHeight: 440 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
