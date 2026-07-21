import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/loading-view';
import { SectionHeader } from '@/components/section-header';
import { StoryCover } from '@/components/story-cover';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import type { Story } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthor, followingIds, progress } = useAppState();
  const { user, configured, signOut } = useAuth();
  const { loading, stories, getStoryById } = useStoriesData();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email || '';

  if (loading) return <LoadingView />;

  const myStories = user ? stories.filter((s) => s.ownerId && s.ownerId === user.id) : [];

  const following = followingIds
    .map((id) => getStoryById(id))
    .filter((s): s is Story => Boolean(s));

  const reading = Object.keys(progress)
    .map((id) => getStoryById(id))
    .filter((s): s is Story => Boolean(s));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>Library</ThemedText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Ionicons name="settings-outline" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* Account */}
          {user ? (
            <View style={[styles.accountCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <ThemedText style={[styles.avatarText, { color: theme.accentOn }]}>
                  {displayName.charAt(0).toUpperCase() || '?'}
                </ThemedText>
              </View>
              <View style={styles.accountBody}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {displayName}
                </ThemedText>
                <Pressable onPress={() => signOut()} hitSlop={8}>
                  <ThemedText type="small" themeColor="accent">
                    Sign out
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : configured ? (
            <Pressable
              onPress={() => router.push('/auth')}
              style={({ pressed }) => [
                styles.accountCard,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="person" size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.accountBody}>
                <ThemedText type="smallBold">Sign in or create an account</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Sync your library across devices
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}

          {isAuthor && (
            <View style={styles.section}>
              <SectionHeader
                title="Your stories"
                subtitle={myStories.length ? `${myStories.length} published` : 'Share your writing'}
              />
              <Pressable
                onPress={() => router.push('/write')}
                style={({ pressed }) => [
                  styles.writeBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="create-outline" size={18} color={theme.accentOn} />
                <ThemedText style={[styles.writeBtnText, { color: theme.accentOn }]}>
                  Write a new story
                </ThemedText>
              </Pressable>
              {myStories.map((s) => (
                <LibraryRow
                  key={s.id}
                  story={s}
                  subtitle={`${s.status === 'draft' ? '● Draft · ' : ''}${
                    s.format === 'serial' ? `${s.chapters.length} chapters` : 'Standalone'
                  }`}
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Following" subtitle={`${following.length} stories`} />
            {following.length === 0 ? (
              <EmptyHint text="Stories you follow will appear here. Tap “Follow” on any story." />
            ) : (
              following.map((s) => <LibraryRow key={s.id} story={s} />)
            )}
          </View>

          {reading.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Continue reading" />
              {reading.map((s) => (
                <LibraryRow key={s.id} story={s} subtitle="In progress" />
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function LibraryRow({ story, subtitle }: { story: Story; subtitle?: string }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.id } })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <StoryCover story={story} width={48} height={68} showTitle={false} radius={8} />
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {story.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle ?? `by ${story.author.name}`}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  accountBody: { flex: 1, gap: 2 },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginVertical: Spacing.two,
  },
  writeBtnText: { fontSize: 16, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subCard: { borderRadius: Spacing.four, padding: Spacing.three, gap: Spacing.two },
  subCardCta: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ctaTitle: { fontSize: 18, fontWeight: '800' },
  cancelLink: { textDecorationLine: 'underline', marginTop: 4 },
  section: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowBody: { flex: 1, gap: 2 },
  empty: { paddingVertical: Spacing.three },
});
