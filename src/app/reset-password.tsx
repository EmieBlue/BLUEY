import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

/**
 * Landing screen for the emailed password-reset link. On web, `supabase` has
 * `detectSessionInUrl` on, so opening the link creates a short-lived recovery
 * session — we then let the user pick a new password (updateUser).
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, initializing, updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords don’t match.');
      return;
    }
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
  };

  const input = (
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
  ) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry
      autoCapitalize="none"
      style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.body}>
          <BrandLogo size={96} style={styles.brand} />

          {done ? (
            <>
              <ThemedText style={styles.title}>Password updated</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                You’re all set — you can keep reading now.
              </ThemedText>
              <Cta label="Continue" theme={theme} onPress={() => router.replace('/')} />
            </>
          ) : initializing ? (
            <ActivityIndicator color={theme.accent} />
          ) : session ? (
            <>
              <ThemedText style={styles.title}>Set a new password</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Choose a new password for your account.
              </ThemedText>
              {input('New password', password, setPassword)}
              {input('Confirm new password', confirm, setConfirm)}
              {error ? (
                <ThemedText type="small" style={{ color: '#C0392B' }}>
                  {error}
                </ThemedText>
              ) : null}
              <Cta
                label={busy ? '' : 'Save new password'}
                theme={theme}
                onPress={onSubmit}
                busy={busy}
              />
            </>
          ) : (
            <>
              <ThemedText style={styles.title}>Reset link needed</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Open the link from your password-reset email to set a new password. If it has
                expired, request a new one from the sign-in screen.
              </ThemedText>
              <Cta label="Back to sign in" theme={theme} onPress={() => router.replace('/auth')} />
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Cta({
  label,
  theme,
  onPress,
  busy,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: theme.accent, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.accentOn} />
      ) : (
        <ThemedText style={[styles.ctaText, { color: theme.accentOn }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  brand: { alignSelf: 'center', marginBottom: Spacing.two },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, marginBottom: Spacing.two },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    height: 52,
    fontSize: 16,
  },
  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
});
