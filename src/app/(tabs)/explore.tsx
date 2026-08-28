import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/loading-view';
import { GridCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WriteFab } from '@/components/write-fab';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStoriesData } from '@/context/stories';
import { ALL_GENRES, type Genre } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export default function ExploreScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { loading, searchStories } = useStoriesData();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [format, setFormat] = useState<'all' | 'novel' | 'comic' | 'film'>('all');

  const results = useMemo(() => {
    let list = searchStories(query).filter((s) => s.status !== 'draft');
    if (genre) list = list.filter((s) => s.genres.includes(genre));
    if (format !== 'all') list = list.filter((s) => (s.kind ?? 'novel') === format);
    return list;
  }, [query, genre, format, searchStories]);

  if (loading) return <LoadingView />;

  // Responsive grid: 2 columns on phones, 3-4 on a wider website layout.
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const numCols = Math.max(2, Math.min(4, Math.floor(contentWidth / 230)));
  const cardWidth = (contentWidth - Spacing.three * (numCols - 1)) / numCols;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <ThemedText style={styles.title}>Explore</ThemedText>

          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search titles, authors, genres"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.formatRow}>
            <GenreChip label="All" active={format === 'all'} onPress={() => setFormat('all')} />
            <GenreChip label="Novels" active={format === 'novel'} onPress={() => setFormat('novel')} />
            <GenreChip label="Comics" active={format === 'comic'} onPress={() => setFormat('comic')} />
            <GenreChip label="Films" active={format === 'film'} onPress={() => setFormat('film')} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            <GenreChip label="All" active={genre === null} onPress={() => setGenre(null)} />
            {ALL_GENRES.map((g) => (
              <GenreChip
                key={g}
                label={g}
                active={genre === g}
                onPress={() => setGenre((cur) => (cur === g ? null : g))}
              />
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No stories match “{query}”.
            </ThemedText>
          ) : (
            results.map((story) => (
              <GridCard key={story.id} story={story} width={cardWidth} />
            ))
          )}
        </ScrollView>
        <WriteFab />
      </SafeAreaView>
    </ThemedView>
  );
}

function GenreChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.text : theme.backgroundElement },
      ]}>
      <ThemedText
        type="small"
        style={[styles.chipText, { color: active ? theme.background : theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
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
  headerWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  chipsRow: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  formatRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  chipText: {
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  empty: {
    paddingVertical: Spacing.five,
    textAlign: 'center',
    width: '100%',
  },
});
