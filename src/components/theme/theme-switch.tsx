import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeToggle } from './use-theme-toggle';

export type ThemeSwitchProps = { onAnimatingChange?: (busy: boolean) => void };

export function ThemeSwitch(_props: ThemeSwitchProps) {
  const { isDark, palette, oppositeKey, setThemeKey } = useThemeToggle();
  return (
    <View style={styles.row}>
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={24} color={palette.accent} />
      <ThemedText style={styles.label}>Dark mode</ThemedText>
      <Switch
        accessibilityLabel="Dark mode"
        value={isDark}
        onValueChange={() => setThemeKey(oppositeKey)}
        trackColor={{ false: palette.backgroundSelected, true: palette.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  label: { flex: 1 },
});
