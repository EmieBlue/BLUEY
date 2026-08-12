import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StoryCover } from '@/components/story-cover';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatReads, hasPremiumChapters } from '@/data/stories';
import type { Story } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

function useOpenStory(storyId: string) {
  const router = useRouter();
  return () => router.push({ pathname: '/story/[id]', params: { id: storyId } });
}

function formatLabel(story: Story): string {
  if (story.format === 'standalone') return 'Short story';
  if (story.isComplete) return `Complete · ${story.chapters.length} ch`;
  return `Serial · ${story.chapters.length} ch`;
}

/** Corner chip shown on a cover the author hasn't published yet. */
function DraftBadge() {
  return (
    <View style={styles.draftBadge}>
      <ThemedText style={styles.draftBadgeText}>DRAFT</ThemedText>
    </View>
  );
}

/** Small inline row: rating ★, reads, and a premium marker if relevant. */
export function StoryMeta({ story }: { story: Story }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Ionicons name="star" size={13} color="#F5A623" />
      <ThemedText type="small" themeColor="textSecondary">
        {story.rating.toFixed(1)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        · {formatReads(story.readsCount)} reads
      </ThemedText>
      {hasPremiumChapters(story) && (
        <View style={styles.premiumTag}>
          <Ionicons name="lock-closed" size={11} color={theme.text} />
          <ThemedText type="small" style={styles.premiumTagText}>
            Premium
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/** Large hero card for the top of Home. */
export function FeaturedCard({ story }: { story: Story }) {
  const open = useOpenStory(story.id);
  const theme = useTheme();
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.featured,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
      ]}>
      <StoryCover story={story} width={120} height={172} showTitle={false} />
      <View style={styles.featuredBody}>
        <ThemedText type="small" themeColor="textSecondary">
          ✨ Featured
        </ThemedText>
        <ThemedText type="subtitle" numberOfLines={2} style={styles.featuredTitle}>
          {story.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          by {story.author.name}
        </ThemedText>
        <ThemedText type="small" numberOfLines={3} style={styles.featuredBlurb}>
          {story.blurb}
        </ThemedText>
        <StoryMeta story={story} />
      </View>
    </Pressable>
  );
}

/** Fixed-width card for horizontal "shelf" scroll rows. */
export function ShelfCard({ story }: { story: Story }) {
  const open = useOpenStory(story.id);
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.shelf, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.coverShadow}>
        <StoryCover story={story} width={150} height={220} showTitle={false} />
        {story.status === 'draft' && <DraftBadge />}
      </View>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.shelfTitle}>
        {story.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {formatLabel(story)}
      </ThemedText>
    </Pressable>
  );
}

/** Flexible card used inside the Explore grid (give it a fixed width via wrapper). */
export function GridCard({ story, width }: { story: Story; width: number }) {
  const open = useOpenStory(story.id);
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.coverShadow}>
        <StoryCover story={story} width={width} height={width * 1.45} showTitle={false} />
        {story.status === 'draft' && <DraftBadge />}
      </View>
      <ThemedText type="smallBold" numberOfLines={2} style={styles.shelfTitle}>
        {story.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        by {story.author.name}
      </ThemedText>
      <StoryMeta story={story} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  premiumTagText: {
    fontWeight: '700',
  },
  featured: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  featuredBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  featuredTitle: {
    fontSize: 24,
    lineHeight: 30,
    marginTop: 2,
  },
  featuredBlurb: {
    marginTop: 6,
  },
  shelf: {
    width: 150,
    gap: 2,
  },
  coverShadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  draftBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  draftBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  shelfTitle: {
    marginTop: 8,
  },
});
