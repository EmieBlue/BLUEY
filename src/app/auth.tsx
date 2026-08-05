import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedOrbs } from '@/components/animated-orbs';
import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_TAGLINE } from '@/config/app';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'signin' | 'signup';

const HERO_GRADIENT = ['#0F8B6D', '#075E4A', '#023025'] as const;

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
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

  const hero = (
    <LinearGradient
      colors={HERO_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, wide ? styles.heroWide : styles.heroNarrow]}>
      <AnimatedOrbs />
      <BrandLogo size={wide ? 104 : 72} />
      <ThemedText style={[styles.welcome, { fontSize: wide ? 52 : 34, lineHeight: wide ? 56 : 38 }]}>
        Welcome{'\n'}Back
      </ThemedText>
      <ThemedText style={styles.heroTagline}>{APP_TAGLINE}</ThemedText>
    </LinearGradient>
  );

  const form = (
    <ScrollView
      contentContainerStyle={styles.formScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.formInner}>
        <ThemedText style={styles.title}>{isSignup ? 'Create your account' : 'Sign in'}</ThemedText>
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
          <ThemedText type="small" style={[styles.message, { color: '#2E8B57' }]}>
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
              {isSignup ? 'Create account' : 'Sign in now'}
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
      </View>
    </ScrollView>
  );

  return (
    <ThemedView style={styles.container}>
      <AnimatedOrbs subtle />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={wide ? styles.rowWide : styles.colNarrow}>
          {hero}
          {wide ? <View style={styles.formCol}>{form}</View> : form}
        </View>
      </KeyboardAvoidingView>

      {/* Close (X) floats over everything; dark translucent so it shows on both panels. */}
      <SafeAreaView edges={['top']} style={styles.closeSafe} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
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
  container: { flex: 1 },
  rowWide: { flex: 1, flexDirection: 'row' },
  colNarrow: { flex: 1, flexDirection: 'column' },

  hero: { alignItems: 'flex-start', justifyContent: 'center', gap: Spacing.three, overflow: 'hidden' },
  heroWide: { flex: 0.9, paddingHorizontal: Spacing.six, paddingVertical: Spacing.five },
  heroNarrow: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  welcome: { color: '#FFFFFF', fontWeight: '800', letterSpacing: -1 },
  heroTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 24, maxWidth: 360 },

  formCol: { flex: 1.1 },
  formScroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four },
  formInner: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: Spacing.three },
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
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.one },
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

  closeSafe: { position: 'absolute', top: 0, right: 0, padding: Spacing.three },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
