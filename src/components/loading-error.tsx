import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function LoadingError({
  title = 'Could not load stories', message, onRetry, onBack, compact = false,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
  onBack?: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.container, !compact && styles.fill]}>
      {onBack && <SafeAreaView edges={['top']} style={styles.back}><BackButton onPress={onBack} /></SafeAreaView>}
      <View style={styles.message} accessibilityLiveRegion="polite">
        <Ionicons name="cloud-offline-outline" size={30} color={theme.textSecondary} />
        <ThemedText type="smallBold" style={styles.center}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>{message}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry}
          style={({ pressed }) => [styles.retry, { borderColor: theme.accent, backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
          <Ionicons name="refresh" size={18} color={theme.text} />
          <ThemedText type="smallBold">Try again</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  message: { maxWidth: 360, alignItems: 'center', gap: 14 },
  center: { textAlign: 'center' },
  back: { position: 'absolute', top: 0, left: 16, paddingTop: 8 },
  retry: { minHeight: 44, paddingHorizontal: 18, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
