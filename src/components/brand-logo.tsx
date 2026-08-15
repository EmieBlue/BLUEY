import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * The Bluey brand mark (gold quill + book + wordmark on deep forest green).
 * Shown as a rounded badge so the logo's own green background reads as
 * intentional on top of any of the app's color themes.
 */
export function BrandLogo({
  size = 96,
  bare = false,
  style,
}: {
  size?: number;
  /** Transparent mark with no green badge — blends onto any background (e.g. the login). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (bare) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          source={require('@/assets/images/elyra-mark.png')}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
      </View>
    );
  }
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
      <Image
        source={require('@/assets/images/elyra-mark.png')}
        style={styles.badgeImg}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    // Deep forest-green field behind the gold quill mark.
    backgroundColor: '#023025',
  },
  badgeImg: { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '15%' },
});
