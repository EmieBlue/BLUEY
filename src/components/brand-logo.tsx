import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const MARK = require('@/assets/images/elyra-mark.png');
const LOCKUP = require('@/assets/images/elyra-logo.png');
/** Height ÷ width of the trimmed full-lockup art (quill + book + ELYRA). */
const LOCKUP_ASPECT = 740 / 627;

/**
 * The Elyra brand mark. Three forms:
 *  - `full`  → the complete lockup (gold quill + book + white "ELYRA"),
 *             transparent so it blends on any background. `size` is its WIDTH.
 *  - `bare`  → just the transparent gold quill mark (no wordmark).
 *  - default → the quill mark on a rounded deep-green badge.
 */
export function BrandLogo({
  size = 96,
  bare = false,
  full = false,
  style,
}: {
  size?: number;
  /** Transparent mark with no green badge — blends onto any background. */
  bare?: boolean;
  /** Full lockup (quill + book + ELYRA), transparent. `size` sets its width. */
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (full) {
    return (
      <View style={[{ width: size, height: size * LOCKUP_ASPECT }, style]}>
        <Image source={LOCKUP} style={StyleSheet.absoluteFill} contentFit="contain" />
      </View>
    );
  }
  if (bare) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image source={MARK} style={StyleSheet.absoluteFill} contentFit="contain" />
      </View>
    );
  }
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
      <Image source={MARK} style={styles.badgeImg} contentFit="contain" />
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
