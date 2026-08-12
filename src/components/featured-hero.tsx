import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StoryCover } from '@/components/story-cover';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Story } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Darken a #rrggbb hex color by `amount` (0–1) for the gradient fallback. */
function darken(hex: string, amount = 0.45): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Cinematic "spotlight" for the featured book: the cover art is blurred into a
 * moody backdrop, and the real (crisp) portrait cover stands in front beside the
 * title + a Read-now button. Designed for portrait cover artwork so nothing gets
 * cropped or has app text stamped over it.
 */
export function FeaturedHero({ story }: { story: Story }) {
  const router = useRouter();
  const theme = useTheme();
  const open = () => router.push({ pathname: '/story/[id]', params: { id: story.id } });
  const genre = story.genres?.[0];

  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.95 : 1 }]}>
      {/* Blurred backdrop from the cover art (or the cover colour). */}
      {story.coverImageUrl ? (
        <Image
          source={{ uri: story.coverImageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={30}
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={[story.coverColor, darken(story.coverColor)]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(3,20,16,0.55)', 'rgba(3,20,16,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.row}>
        <View style={styles.coverShadow}>
          <StoryCover story={story} width={118} height={177} showTitle={false} radius={12} />
        </View>

        <View style={styles.info}>
          <View style={styles.pill}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <ThemedText style={styles.pillText}>Featured</ThemedText>
          </View>
          <ThemedText numberOfLines={2} style={styles.title}>
            {story.title}
          </ThemedText>
          <ThemedText numberOfLines={1} style={styles.author}>
            by {story.author.name}
            {genre ? ` · ${genre}` : ''}
          </ThemedText>
          <View style={[styles.cta, { backgroundColor: theme.accent }]}>
            <Ionicons name="book" size={15} color={theme.accentOn} />
            <ThemedText style={[styles.ctaText, { color: theme.accentOn }]}>Read now</ThemedText>
          </View>
        </View>
      </View>

      {story.status === 'draft' && (
        <View style={styles.draftBadge}>
          <ThemedText style={styles.draftBadgeText}>DRAFT</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 210,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0C2A22',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  coverShadow: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  info: { flex: 1, gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 2,
  },
  pillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5 },
  author: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 15, fontWeight: '800' },
  draftBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  draftBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
