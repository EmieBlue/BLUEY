import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, signUp, resetPassword, configured } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    const result = isSignup
      ? await signUp(email.trim(), password, name.trim() || undefined)
      : await signIn(email.trim(), password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo('Almost there — check your email to confirm your account, then sign in.');
      setMode('signin');
      return;
    }
    // Signed in: the session is now set, close the modal.
    router.back();
  };

  const onForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email above first, then tap “Forgot password?”.');
      return;
    }
    setBusy(true);
    const res = await resetPassword(email.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo('Check your email for a link to reset your password.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <BrandLogo size={108} style={styles.brand} />
            <ThemedText style={styles.title}>
              {isSignup ? 'Create your account' : 'Welcome back'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {isSignup
                ? 'Save your library and reading progress across devices.'
                : 'Sign in to pick up where you left off.'}
            </ThemedText>

            {!configured && (
              <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="information-circle" size={18} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  Accounts aren’t connected yet. Add your Supabase keys to enable sign-in.
                </ThemedText>
              </View>
            )}

            {isSignup && (
              <Field
                icon="person-outline"
                placeholder="Display name (optional)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <Field
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {!isSignup && (
              <Pressable onPress={onForgot} hitSlop={8} style={styles.forgotRow}>
                <ThemedText type="small" themeColor="accent">
                  Forgot password?
                </ThemedText>
              </Pressable>
            )}

            {error && (
              <ThemedText type="small" style={[styles.message, { color: '#C0392B' }]}>
                {error}
              </ThemedText>
            )}
            {info && (
              <ThemedText type="small" style={[styles.message, { color: '#3BA55D' }]}>
                {info}
              </ThemedText>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.accent, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
              ]}>
              {busy ? (
                <ActivityIndicator color={theme.accentOn} />
              ) : (
                <ThemedText style={[styles.ctaText, { color: theme.accentOn }]}>
                  {isSignup ? 'Create account' : 'Sign in'}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setError(null);
                setInfo(null);
              }}
              hitSlop={8}
              style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {isSignup ? 'Already have an account? ' : 'New here? '}
                <ThemedText type="small" themeColor="accent">
                  {isSignup ? 'Sign in' : 'Create one'}
                </ThemedText>
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  icon,
  secureTextEntry,
  ...inputProps
}: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  // Password fields start hidden but can be revealed with the eye button.
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        secureTextEntry={secureTextEntry ? hidden : false}
        {...inputProps}
      />
      {secureTextEntry ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  closeRow: { paddingVertical: Spacing.three, alignItems: 'flex-end' },
  body: { gap: Spacing.three, paddingBottom: Spacing.five },
  brand: { marginBottom: Spacing.one },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, marginBottom: Spacing.two },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 52,
    borderRadius: 12,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  message: { marginTop: -4 },
  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
  switchRow: { alignItems: 'center', paddingVertical: Spacing.two },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.one },
});
