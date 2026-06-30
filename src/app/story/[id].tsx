import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { LoadingView } from '@/components/loading-view';
import { StoryCover } from '@/components/story-cover';
import { StoryMeta } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import { hasPremiumChapters } from '@/data/stories';
import { setStoryStatus } from '@/lib/publish-story';
import type { Chapter, Story } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { isSubscribed, isAuthor, isFollowing, toggleFollow, getProgressChapterId } = useAppState();
  const { loading, getStoryById, refresh } = useStoriesData();
  const { user } = useAuth();
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  if (loading) return <LoadingView />;

  const story = getStoryById(id);

  if (!story) {
    return (
      <ThemedView style={styles.notFound}>
        <ThemedText>Story not found.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const following = isFollowing(story.id);
  const progressChapterId = getProgressChapterId(story.id);
  const showPremiumBanner = hasPremiumChapters(story) && !isSubscribed;
  const isOwner = isAuthor && !!user && story.ownerId === user.id;

  const publishNow = async () => {
    if (story.chapters.length === 0) {
      setOwnerError('Add at least one chapter before publishing.');
      return;
    }
    setOwnerError(null);
    setOwnerBusy(true);
    const res = await setStoryStatus(story.id, 'published');
    await refresh();
    setOwnerBusy(false);
    if (res.error) setOwnerError(res.error);
  };

  const openChapter = (chapter: Chapter) => {
    if (chapter.isPremium && !isSubscribed) {
      router.push('/paywall');
      return;
    }
    router.push({
      pathname: '/reader/[storyId]/[chapterId]',
      params: { storyId: story.id, chapterId: chapter.id },
    });
  };

  const primaryChapter =
    story.chapters.find((c) => c.id === progressChapterId) ?? story.chapters[0];
  const primaryLabel = progressChapterId
    ? 'Continue reading'
    : story.format === 'standalone'
      ? 'Read story'
      : 'Start reading';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <StoryCover story={story} width={130} height={186} showTitle={false} />
            <View style={styles.heroInfo}>
              <ThemedText style={styles.title}>{story.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                by {story.author.name}
              </ThemedText>
              {isOwner && story.status === 'draft' && (
                <View style={[styles.draftPill, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Draft — only you can see this
                  </ThemedText>
                </View>
              )}
              <StoryMeta story={story} />
              <View style={styles.genreRow}>
                {story.isMature && (
                  <View style={styles.maturePill}>
                    <ThemedText type="small" style={{ color: '#fff', fontWeight: '700' }}>
                      Mature 18+
                    </ThemedText>
                  </View>
                )}
                {story.genres.map((g) => (
                  <View key={g} style={[styles.genrePill, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="small">{g}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => openChapter(primaryChapter)}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Ionicons name="book" size={18} color={theme.accentOn} />
              <ThemedText style={[styles.primaryBtnText, { color: theme.accentOn }]}>
                {primaryLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => toggleFollow(story.id)}
              style={({ pressed }) => [
                styles.followBtn,
                {
                  borderColor: theme.backgroundSelected,
                  backgroundColor: following ? theme.backgroundElement : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Ionicons
                name={following ? 'heart' : 'heart-outline'}
                size={20}
                color={following ? '#E0245E' : theme.text}
              />
            </Pressable>
          </View>

          {/* Author controls */}
          {isOwner && (
            <View style={{ gap: Spacing.two }}>
              {story.status === 'draft' && (
                <Pressable
                  onPress={publishNow}
                  disabled={ownerBusy}
                  style={[styles.ownerBtn, { backgroundColor: theme.accent, opacity: ownerBusy ? 0.6 : 1 }]}>
                  {ownerBusy ? (
                    <ActivityIndicator color={theme.accentOn} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                      Publish story
                    </ThemedText>
                  )}
                </Pressable>
              )}
              <View style={styles.ownerRow}>
                <Pressable
                  onPress={() => router.push({ pathname: '/write', params: { storyId: story.id } })}
                  style={[styles.ownerBtn, { borderColor: theme.accent, borderWidth: 1.5 }]}>
                  <Ionicons name="create-outline" size={18} color={theme.accent} />
                  <ThemedText type="smallBold" themeColor="accent">
                    Edit story
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/add-chapter', params: { storyId: story.id } })}
                  style={[styles.ownerBtn, { borderColor: theme.accent, borderWidth: 1.5 }]}>
                  <Ionicons name="add" size={18} color={theme.accent} />
                  <ThemedText type="smallBold" themeColor="accent">
                    Add chapter
                  </ThemedText>
                </Pressable>
              </View>
              {ownerError && (
                <ThemedText type="small" style={{ color: '#C0392B' }}>
                  {ownerError}
                </ThemedText>
              )}
            </View>
          )}

          {/* About */}
          <ThemedText style={styles.description}>{story.description}</ThemedText>

          {/* Tags & details */}
          {((story.tags?.length ?? 0) > 0 ||
            (story.mainCharacters?.length ?? 0) > 0 ||
            !!story.language) && (
            <View style={styles.metaSection}>
              {story.tags && story.tags.length > 0 && (
                <View style={styles.genreRow}>
                  {story.tags.map((t) => (
                    <View key={t} style={[styles.tagPill, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        #{t}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
              {story.mainCharacters && story.mainCharacters.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Characters: {story.mainCharacters.join(', ')}
                </ThemedText>
              )}
              {(story.language || story.copyright || story.targetAudience) && (
                <ThemedText type="small" themeColor="textSecondary">
                  {[story.language, story.copyright, story.targetAudience].filter(Boolean).join(' · ')}
                </ThemedText>
              )}
            </View>
          )}

          {/* Premium nudge */}
          {showPremiumBanner && (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.premiumBanner, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="sparkles" size={20} color="#F5A623" />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">Some chapters are premium</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Subscribe to unlock the full story.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          )}

          {/* Chapters (hidden for single-chapter standalone stories) */}
          {story.format === 'serial' && (
            <View style={styles.chapterList}>
              <ThemedText style={styles.chaptersHeading}>
                {story.chapters.length} chapters{story.isComplete ? ' · Complete' : ' · Ongoing'}
              </ThemedText>
              {story.chapters.map((chapter) => (
                <ChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  locked={chapter.isPremium && !isSubscribed}
                  isCurrent={chapter.id === progressChapterId}
                  onPress={() => openChapter(chapter)}
                  onEdit={
                    isOwner
                      ? () =>
                          router.push({
                            pathname: '/add-chapter',
                            params: { storyId: story.id, chapterId: chapter.id },
                          })
                      : undefined
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ChapterRow({
  chapter,
  locked,
  isCurrent,
  onPress,
  onEdit,
}: {
  chapter: Chapter;
  locked: boolean;
  isCurrent: boolean;
  onPress: () => void;
  onEdit?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chapterRow,
        {
          borderColor: theme.backgroundSelected,
          backgroundColor: isCurrent ? theme.backgroundElement : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.chapterNum}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {chapter.order}
        </ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {chapter.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {chapter.readingMinutes} min read{isCurrent ? ' · continue' : ''}
        </ThemedText>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={10} style={styles.chapterEdit}>
          <Ionicons name="create-outline" size={18} color={theme.accent} />
        </Pressable>
      )}
      <Ionicons
        name={locked ? 'lock-closed' : 'chevron-forward'}
        size={18}
        color={locked ? '#F5A623' : theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  draftPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  ownerRow: { flexDirection: 'row', gap: Spacing.three },
  ownerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: 12,
  },
  maturePill: {
    backgroundColor: '#B23B3B',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagPill: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: 999 },
  metaSection: { gap: Spacing.two },
  chapterEdit: { padding: 4, marginRight: 4 },
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  headerBar: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  hero: { flexDirection: 'row', gap: Spacing.three },
  heroInfo: { flex: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  genrePill: { paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: 999 },
  actions: { flexDirection: 'row', gap: Spacing.three },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  followBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { fontSize: 16, lineHeight: 24 },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  chapterList: { gap: Spacing.two },
  chaptersHeading: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.one },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  chapterNum: { width: 24, alignItems: 'center' },
});
