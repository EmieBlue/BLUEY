import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PREMIUM_PLAN } from '@/config/app';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { startCheckout } from '@/lib/checkout';

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { subscribe } = useAppState();
  const { user, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = async () => {
    // No Supabase/Stripe wired up (local demo) → just unlock locally.
    if (!configured) {
      subscribe();
      router.back();
      return;
    }
    // A subscription is tied to an account, so sign in first.
    if (!user) {
      router.replace('/auth');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await startCheckout({ id: user.id, email: user.email });
      // On web this navigates away; on native the browser opens over us.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Ionicons name="sparkles" size={44} color="#F5A623" />
          <ThemedText style={styles.title}>{PREMIUM_PLAN.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Everything, unlocked. Cancel anytime.
          </ThemedText>

          <View style={styles.perks}>
            {PREMIUM_PLAN.perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <Ionicons name="checkmark-circle" size={22} color="#3BA55D" />
                <ThemedText style={styles.perkText}>{perk}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          {error ? (
            <ThemedText type="small" style={[styles.error, { color: '#E5484D' }]}>
              {error}
            </ThemedText>
          ) : null}
          <Pressable
            onPress={onSubscribe}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.accent, opacity: busy ? 0.7 : pressed ? 0.85 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color={theme.accentOn} />
            ) : (
              <ThemedText style={[styles.ctaText, { color: theme.accentOn }]}>
                Subscribe · {PREMIUM_PLAN.priceLabel}/{PREMIUM_PLAN.period}
              </ThemedText>
            )}
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            Secure payment by Stripe. Cancel anytime.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  closeRow: { paddingVertical: Spacing.three, alignItems: 'flex-end' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginBottom: Spacing.three },
  perks: { gap: Spacing.three, marginTop: Spacing.two },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  perkText: { fontSize: 16, flex: 1 },
  footer: { gap: Spacing.three, paddingBottom: Spacing.three },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
  disclaimer: { textAlign: 'center' },
  error: { textAlign: 'center' },
});
