import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { APP_TAGLINE } from '@/config/app';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Landing / introduction hero shown at the top of Home to signed-out visitors —
 * the app's "front door" for people arriving from social media. Pitches Elyra and
 * puts "Create free account" front-and-centre (so nobody needs the Library tab),
 * while the browsable shelves sit right below it.
 */
const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'heart', text: 'Original romance & dark-fantasy stories' },
  { icon: 'images', text: 'New — comics & webtoons to flip through' },
  { icon: 'volume-high', text: 'Listen: every story read aloud in natural voices' },
  { icon: 'infinite', text: 'Buy a book once — yours forever, on any device' },
];

export function WelcomeHero() {
  const theme = useTheme();
  const router = useRouter();
  const [showInstall, setShowInstall] = useState(false);

  return (
    <View style={styles.wrap}>
      <BrandLogo full size={168} />

      <ThemedText style={styles.headline}>Escape into a story you can feel.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
        {APP_TAGLINE}
      </ThemedText>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefitRow}>
            <Ionicons name={b.icon} size={18} color={theme.accent} />
            <ThemedText style={styles.benefitText}>{b.text}</ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/auth')}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={[styles.ctaText, { color: theme.accentOn }]}>
          Create your free account
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => router.navigate('/explore')} hitSlop={8} style={styles.secondary}>
        <ThemedText type="smallBold" themeColor="accent">
          or browse stories first ↓
        </ThemedText>
      </Pressable>

      {/* Install-to-phone hint */}
      <Pressable
        onPress={() => setShowInstall((v) => !v)}
        style={[styles.installBar, { borderColor: theme.backgroundSelected }]}>
        <Ionicons name="phone-portrait-outline" size={16} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          Save Elyra to your phone like an app
        </ThemedText>
        <Ionicons
          name={showInstall ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>
      {showInstall && (
        <View style={[styles.installSteps, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.step}>
            <ThemedText type="smallBold">iPhone:</ThemedText> open this site in Safari → tap the Share
            button → <ThemedText type="smallBold">Add to Home Screen</ThemedText>.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.step}>
            <ThemedText type="smallBold">Android:</ThemedText> tap the ⋮ menu in Chrome →{' '}
            <ThemedText type="smallBold">Install app</ThemedText> (or “Add to Home screen”).
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.four },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: Spacing.one,
  },
  tagline: { textAlign: 'center', maxWidth: 420 },
  benefits: { gap: Spacing.two, alignSelf: 'stretch', maxWidth: 460, width: '100%', marginTop: Spacing.two },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  benefitText: { fontSize: 15, flex: 1 },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    maxWidth: 460,
    width: '100%',
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
  secondary: { paddingVertical: Spacing.one },
  installBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'stretch',
    maxWidth: 460,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  installSteps: {
    alignSelf: 'stretch',
    maxWidth: 460,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  step: { lineHeight: 20 },
});
