import { Platform, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { APP_NAME } from '@/config/app';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The app name set as an elegant serif wordmark (pairs with the quill icon). */
export function Wordmark({
  size = 26,
  color,
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.mark,
        { fontSize: size, lineHeight: Math.round(size * 1.1), color: color ?? theme.text },
        style,
      ]}>
      {APP_NAME}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : Fonts?.serif,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
