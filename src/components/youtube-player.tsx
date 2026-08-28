import { Ionicons } from '@expo/vector-icons';
import { createElement } from 'react';
import { Linking, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { youTubeEmbedUrl } from '@/lib/youtube';

/**
 * Plays a YouTube video: a responsive inline player (iframe) on web, and a
 * "Watch video" button that opens the YouTube app/browser on native. Accepts
 * watch, youtu.be, /embed/ and /shorts/ links.
 */
export function YouTubePlayer({ url }: { url: string }) {
  const theme = useTheme();
  const embed = youTubeEmbedUrl(url);

  if (Platform.OS === 'web' && embed) {
    // RN Web renders the 'iframe' host element.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createElement('iframe' as any, {
      src: embed,
      title: 'Video',
      allowFullScreen: true,
      allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      style: { width: '100%', aspectRatio: 16 / 9, border: 0, borderRadius: 14, display: 'block' },
    });
  }

  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="logo-youtube" size={24} color="#FF0000" />
      <ThemedText type="smallBold">Watch video</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 140,
    borderRadius: 14,
  },
});
