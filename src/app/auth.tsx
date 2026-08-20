import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { DepthBackground } from '@/components/depth-background';
import { LoginIntro } from '@/components/login-intro';
import { Reveal } from '@/components/reveal';
import { TiltCard } from '@/components/tilt-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_TAGLINE } from '@/config/app';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'signin' | 'signup';

// Fallback background when no book cover has a photo yet.
const HERO_GRADIENT = ['#0F8B6D', '#075E4A', '#023025'] as const;
// Dark, emerald-tinted scrim over the photo so the glass card + white text pop.
const SCRIM = ['rgba(2,48,37,0.45)', 'rgba(3,20,16,0.82)'] as const;

// Frosted-glass blur only exists on web; native gets the translucent card look.
const glassWeb =
  Platform.OS === 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS passthrough
      ({ backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)' } as any)
    : null;

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, signUp, resetPassword, configured } = useAuth();
  const { stories } = useStoriesData();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Cinematic "starter": the logo scans in, then the card cascades up.
  const [intro, setIntro] = useState(true);

  const isSignup = mode === 'signup';

  // Real book covers for the atmospheric background: one blurred as the far
  // "wall", the rest floating in 3D depth (DepthBackground).
  const coverUrls = stories
    .filter((s) => s.status !== 'draft' && s.coverImageUrl)
    .map((s) => s.coverImageUrl as string);
  const heroCover = coverUrls[0];

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

  return (
    <ThemedView style={styles.container}>
      {/* Full-bleed background: a blurred book cover, or the emerald gradient. */}
      {heroCover ? (
        <Image
          source={{ uri: heroCover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={18}
          transition={250}
        />
      ) : (
        <LinearGradient colors={HERO_GRADIENT} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
      <DepthBackground covers={coverUrls} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TiltCard radius={24} style={styles.tiltWrap}>
          <View style={[styles.card, glassWeb]}>
            <Reveal active={!intro} delay={0} style={styles.group}>
              <BrandLogo full size={148} style={styles.logo} />
              <ThemedText style={styles.title}>
                {isSignup ? 'Create your\naccount' : 'Welcome\nback'}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {isSignup
                  ? 'Join Elyra to save your library and read across devices.'
                  : APP_TAGLINE}
              </ThemedText>
            </Reveal>

            <Reveal active={!intro} delay={170} style={styles.group}>
              {!configured && (
                <View style={styles.banner}>
                  <Ionicons name="information-circle" size={18} color="rgba(255,255,255,0.8)" />
                  <ThemedText style={styles.bannerText}>
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
                  <ThemedText style={styles.forgotText}>Forgot password?</ThemedText>
                </Pressable>
              )}

              {error && <ThemedText style={[styles.message, styles.error]}>{error}</ThemedText>}
              {info && <ThemedText style={[styles.message, styles.info]}>{info}</ThemedText>}
            </Reveal>

            <Reveal active={!intro} delay={340} style={styles.group}>
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
                <ThemedText style={styles.switchText}>
                  {isSignup ? 'Already have an account? ' : 'New here? '}
                  <ThemedText style={styles.switchLink}>
                    {isSignup ? 'Sign in' : 'Create one'}
                  </ThemedText>
                </ThemedText>
              </Pressable>
            </Reveal>
          </View>
          </TiltCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Close (X) floats over everything. */}
      <SafeAreaView edges={['top']} style={styles.closeSafe} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>

      {/* Cinematic scan-in "starter" over everything; fades to reveal the card. */}
      {intro && (
        <LoginIntro
          onDone={() => setIntro(false)}
          covers={stories
            .filter((s) => s.coverImageUrl)
            .slice(0, 3)
            .map((s) => s.coverImageUrl as string)}
        />
      )}
    </ThemedView>
  );
}

function Field({
  icon,
  secureTextEntry,
  ...inputProps
}: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.75)" />
      <TextInput
        placeholderTextColor="rgba(255,255,255,0.6)"
        style={styles.input}
        secureTextEntry={secureTextEntry ? hidden : false}
        {...inputProps}
      />
      {secureTextEntry ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="rgba(255,255,255,0.75)"
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#031410' },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  tiltWrap: { width: '100%', maxWidth: 420 },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    // Soft lift off the photo.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
  logo: { marginBottom: Spacing.one },
  wordmark: { marginTop: -Spacing.two },
  group: { gap: Spacing.three },
  title: { color: '#FFFFFF', fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1 },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: -Spacing.one,
    marginBottom: Spacing.one,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bannerText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  input: { flex: 1, fontSize: 16, height: '100%', color: '#FFFFFF' },

  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.one },
  forgotText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  message: { fontSize: 13, marginTop: -4 },
  error: { color: '#FF8A80' },
  info: { color: '#8EE7BE' },

  cta: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },

  switchRow: { alignItems: 'center', paddingVertical: Spacing.one },
  switchText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  switchLink: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

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
