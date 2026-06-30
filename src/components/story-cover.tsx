import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { Story } from '@/data/types';

/** Darken a #rrggbb hex color by `amount` (0–1) for the gradient's far edge. */
function darken(hex: string, amount = 0.35): string {
  const m = hex.replace('#', '');
  const num = parseInt(m, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

interface StoryCoverProps {
  story: Story;
  width: number;
  height: number;
  /** Show the title text on the cover (off for tiny thumbnails). */
  showTitle?: boolean;
  radius?: number;
}

export function StoryCover({
  story,
  width,
  height,
  showTitle = true,
  radius = 16,
}: StoryCoverProps) {
  const emojiSize = Math.round(Math.min(width, height) * 0.32);
  const titleSize = Math.max(12, Math.round(width * 0.1));

  // Uploaded image cover: show the photo with the title overlaid on a scrim.
  if (story.coverImageUrl) {
    return (
      <View style={[styles.cover, { width, height, borderRadius: radius }]}>
        <Image
          source={{ uri: story.coverImageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
        {showTitle && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.scrim}>
            <Text
              numberOfLines={3}
              style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}>
              {story.title}
            </Text>
          </LinearGradient>
        )}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[story.coverColor, darken(story.coverColor)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cover, { width, height, borderRadius: radius }]}>
      <Text style={{ fontSize: emojiSize }}>{story.coverEmoji}</Text>
      {showTitle && (
        <View style={styles.titleWrap}>
          <Text
            numberOfLines={3}
            style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}>
            {story.title}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 12,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingTop: 28,
  },
  titleWrap: {
    marginTop: 'auto',
  },
  title: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
