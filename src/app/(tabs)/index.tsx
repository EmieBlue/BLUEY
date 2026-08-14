import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedOrbs } from '@/components/animated-orbs';
import { BrandLogo } from '@/components/brand-logo';
import { FeaturedHero } from '@/components/featured-hero';
import { SectionHeader } from '@/components/section-header';
import { ShelfCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WriteFab } from '@/components/write-fab';
import { APP_TAGLINE } from '@/config/app';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { LoadingView } from '@/components/loading-view';
import { useAppState } from '@/context/app-state';
import { useStoriesData } from '@/context/stories';
import type { Story } from '@/data/types';

function Shelf({ stories }: { stories: Story[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.shelfRow}>
      {stories.map((story) => (
        <ShelfCard key={story.id} story={story} />
      ))}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { progress } = useAppState();
  const { stories, loading, getStoryById } = useStoriesData();

  if (loading) return <LoadingView />;

  // Show every story the client is allowed to load. Row-Level Security already
  // gates this: a signed-out reader only receives *published* stories, while the
  // author also receives their own drafts — so the author sees a full home (drafts
  // are marked with a badge) and the public still only sees what's published.
  const featured = stories.find((s) => s.coverImageUrl) ?? stories[0];
  const more = featured ? stories.filter((s) => s.id !== featured.id) : stories;

  const continueReading = Object.keys(progress)
    .map((id) => getStoryById(id))
    .filter((s): s is Story => Boolean(s));

  return (
    <ThemedView style={styles.container}>
      <AnimatedOrbs subtle />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BrandLogo bare size={76} />
            <ThemedText type="small" themeColor="textSecondary">
              {APP_TAGLINE}
            </ThemedText>
          </View>

          {featured && (
            <View style={styles.section}>
              <FeaturedHero story={featured} />
            </View>
          )}

          {continueReading.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Continue reading" />
              <Shelf stories={continueReading} />
            </View>
          )}

          {more.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="More stories" subtitle="Fresh from Bluey" />
              <Shelf stories={more} />
            </View>
          )}

          {stories.length === 0 && (
            <View style={styles.empty}>
              <ThemedText type="subtitle">No stories yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                New stories are on the way — check back soon.
              </ThemedText>
            </View>
          )}
        </ScrollView>
        <WriteFab />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.five,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.two,
  },
  section: {
    gap: 0,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  shelfRow: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
  },
});
