import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { createElement, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentsSection } from '@/components/comments-section';
import { LoadingView } from '@/components/loading-view';
import { NaturalImage } from '@/components/natural-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME } from '@/config/app';
import { Fonts, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import type { Chapter } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

const READING_WIDTH = 720;

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
  const { user } = useAuth();
  const { loading, getChapter, getAdjacentChapter } = useStoriesData();

  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [autoAdvance, setAutoAdvance] = useState(autoadvance === '1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoStartedRef = useRef<string | null>(null);

  const result = getChapter(storyId, chapterId);
  const isOwner = !!user && result?.story.ownerId === user.id;
  const hasAccess = result ? hasPurchased(result.story.id) || isOwner : false;
  const locked = result ? result.chapter.isPremium && !hasAccess : false;

  // Load available (English) voices for the picker (web loads them asynchronously).
  useEffect(() => {
    let active = true;
    let tries = 0;
    const load = () => {
      Speech.getAvailableVoicesAsync()
        .then((vs) => {
          if (!active) return;
          const en = vs.filter((v) => v.language?.toLowerCase().startsWith('en'));
          if (en.length) setVoices(en);
          else if (tries++ < 4) setTimeout(load, 700);
        })
        .catch(() => {});
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Remember where the reader got to (only once we know it's readable).
  useEffect(() => {
    if (result && !locked) {
      setProgress(storyId, chapterId);
    }
  }, [result, locked, storyId, chapterId, setProgress]);

  // Stop any read-aloud when the chapter changes or the screen unmounts.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, [chapterId]);

  const handleEnd = () => {
    if (!result) {
      setSpeaking(false);
      return;
    }
    const nx = getAdjacentChapter(result.story.id, result.chapter.id, 'next');
    if (autoAdvance && nx && !(nx.isPremium && !hasAccess)) {
      router.replace({
        pathname: '/reader/[storyId]/[chapterId]',
        params: { storyId: result.story.id, chapterId: nx.id, autoplay: '1', autoadvance: '1' },
      });
    } else {
      setSpeaking(false);
    }
  };

  const speakFrom = (start: number, opts?: { rate?: number; voiceId?: string }) => {
    if (!result) return;
    const r = opts?.rate ?? rate;
    const v = opts && 'voiceId' in opts ? opts.voiceId : voiceId;
    const paras = result.chapter.paragraphs;
    if (!paras.length) return;
    Speech.stop();
    setSpeaking(true);
    for (let i = start; i < paras.length; i++) {
      const idx = i;
      const isLast = i === paras.length - 1;
      Speech.speak(paras[i], {
        rate: r,
        voice: v,
        onStart: () => setCurrentIndex(idx),
        onDone: isLast ? handleEnd : undefined,
      });
    }
  };

  // Auto-start reading when arriving via auto-advance (autoplay=1).
  useEffect(() => {
    if (autoplay === '1' && result && !locked && autoStartedRef.current !== chapterId) {
      autoStartedRef.current = chapterId;
      speakFrom(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, autoplay, loading, locked]);

  const toggleListen = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
    } else {
      speakFrom(0);
    }
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (speaking) speakFrom(currentIndex, { rate: r });
  };

  const changeVoice = (v: string | undefined) => {
    setVoiceId(v);
    if (speaking) speakFrom(currentIndex, { voiceId: v });
  };

  if (loading) return <LoadingView />;

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

  const { story, chapter } = result;

  const goToChapter = (target: Chapter | undefined) => {
    if (!target) return;
    if (target.isPremium && !hasAccess) {
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
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.headerTitle}>
            {story.title}
          </ThemedText>
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
            {story.format === 'serial' && (
              <ThemedText type="small" themeColor="textSecondary">
                Chapter {chapter.order}
              </ThemedText>
            )}
            <ThemedText style={styles.chapterTitle}>{chapter.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.byline}>
              {story.author.name} · {chapter.readingMinutes} min read
            </ThemedText>

            <View style={[styles.audioPanel, { borderColor: theme.backgroundElement }]}>
              <View style={styles.audioTopRow}>
                <Pressable
                  onPress={toggleListen}
                  style={[styles.listenBtn, { backgroundColor: theme.accent }]}>
                  <Ionicons
                    name={speaking ? 'stop' : 'volume-high'}
                    size={18}
                    color={theme.accentOn}
                  />
                  <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                    {speaking ? 'Stop' : 'Listen'}
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

              {voices.length > 0 && (
                <View style={styles.voiceGroup}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Voice
                  </ThemedText>
                  <View style={styles.voiceWrap}>
                    <Pressable
                      onPress={() => changeVoice(undefined)}
                      style={[
                        styles.speedChip,
                        { backgroundColor: !voiceId ? theme.accent : theme.backgroundElement },
                      ]}>
                      <ThemedText type="small" style={{ color: !voiceId ? theme.accentOn : theme.text }}>
                        Default
                      </ThemedText>
                    </Pressable>
                    {voices.map((v) => (
                      <Pressable
                        key={v.identifier}
                        onPress={() => changeVoice(v.identifier)}
                        style={[
                          styles.speedChip,
                          {
                            backgroundColor:
                              voiceId === v.identifier ? theme.accent : theme.backgroundElement,
                          },
                        ]}>
                        <ThemedText
                          type="small"
                          numberOfLines={1}
                          style={{ color: voiceId === v.identifier ? theme.accentOn : theme.text }}>
                          {v.name.split(' - ')[0]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {chapter.imageUrl ? (
              <NaturalImage uri={chapter.imageUrl} style={styles.chapterImage} />
            ) : null}
            {chapter.videoUrl ? <ChapterVideo url={chapter.videoUrl} /> : null}

            {chapter.paragraphs.map((para, i) => (
              <ThemedText key={i} style={styles.paragraph}>
                {para}
              </ThemedText>
            ))}

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
  scroll: { alignItems: 'center', paddingBottom: Spacing.six },
  reading: {
    width: '100%',
    maxWidth: READING_WIDTH,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  chapterTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    marginTop: 4,
  },
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
    lineHeight: 31,
    marginBottom: Spacing.three,
  },
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
});
