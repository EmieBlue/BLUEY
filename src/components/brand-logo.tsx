import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * The Bluey brand mark (gold quill + book + wordmark on deep forest green).
 * Shown as a rounded badge so the logo's own green background reads as
 * intentional on top of any of the app's color themes.
 */
export function BrandLogo({
  size = 96,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
      <Image
        source={require('@/assets/images/bluey-logo-mark.png')}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    // Matches the logo artwork's forest-green field so any letterboxing from
    // `contain` blends seamlessly with the image.
    backgroundColor: '#023025',
  },
});
