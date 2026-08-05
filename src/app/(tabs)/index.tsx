import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedOrbs } from '@/components/animated-orbs';
import { BrandLogo } from '@/components/brand-logo';
import { SectionHeader } from '@/components/section-header';
import { FeaturedCard, ShelfCard } from '@/components/story-card';
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

  // Home shows only published stories (the author's own drafts stay private).
  const published = stories.filter((s) => s.status !== 'draft');
  const featured = published[0];
  const popular = [...published].sort((a, b) => b.readsCount - a.readsCount);
  const freeToStart = published.filter((s) => !s.chapters[0]?.isPremium);

  const continueReading = Object.keys(progress)
    .map((id) => getStoryById(id))
    .filter((s): s is Story => Boolean(s));

  return (
    <ThemedView style={styles.container}>
      <AnimatedOrbs subtle />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BrandLogo size={84} />
            <ThemedText type="small" themeColor="textSecondary">
              {APP_TAGLINE}
            </ThemedText>
          </View>

          {continueReading.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Continue reading" />
              <Shelf stories={continueReading} />
            </View>
          )}

          {featured && (
            <View style={styles.section}>
              <FeaturedCard story={featured} />
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Popular right now" subtitle="What everyone’s reading" />
            <Shelf stories={popular} />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Free to start" subtitle="Begin reading for free" />
            <Shelf stories={freeToStart} />
          </View>
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
  shelfRow: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
  },
});
