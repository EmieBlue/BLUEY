import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

/** Full-screen centered spinner, used while story data loads. */
export function LoadingView({ onBack }: { onBack?: () => void }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={theme.accent} />
      {onBack ? (
        <SafeAreaView edges={['top']} style={styles.back}>
          <BackButton onPress={onBack} />
        </SafeAreaView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', top: 0, left: 16, paddingTop: 8 },
});
