import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

/** Full-screen centered spinner, used while story data loads. */
export function LoadingView() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={theme.accent} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
