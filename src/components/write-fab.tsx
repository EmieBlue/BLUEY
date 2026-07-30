import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

/**
 * Floating "Write" button — an always-visible way for authors to start a NEW
 * story from the main browse screens (the only other entry point is buried in
 * the Library tab). Renders nothing unless the user is a signed-in author, which
 * matches who the write screen actually allows.
 */
export function WriteFab() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isAuthor } = useAppState();

  if (!user || !isAuthor) return null;

  return (
    <Pressable
      accessibilityLabel="Write a new story"
      onPress={() => router.push('/write')}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name="create" size={20} color={theme.accentOn} />
      <ThemedText style={[styles.label, { color: theme.accentOn }]}>Write</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    height: 52,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  label: { fontSize: 16, fontWeight: '800' },
});
