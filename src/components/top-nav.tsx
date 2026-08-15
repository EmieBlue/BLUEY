import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Wordmark } from '@/components/wordmark';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Top navigation bar for the website (wide/desktop web only). On phones the
 * bottom tab bar is used instead; this replaces it up top where a website's
 * navigation is expected. Rendered by `(tabs)/_layout.tsx` when `wide`.
 */
const LINKS = [
  { href: '/', label: 'Home', icon: 'home' as const },
  { href: '/explore', label: 'Explore', icon: 'compass' as const },
  { href: '/library', label: 'Library', icon: 'bookmarks' as const },
];

export function TopNav() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.background, borderBottomColor: theme.backgroundSelected },
      ]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <BrandLogo bare size={30} />
          <Wordmark size={22} />
        </View>
        <View style={styles.links}>
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const color = active ? theme.accent : theme.textSecondary;
            return (
              <Pressable
                key={l.href}
                onPress={() => router.navigate(l.href as never)}
                style={styles.link}>
                <Ionicons name={l.icon} size={18} color={color} />
                <ThemedText type="smallBold" style={{ color }}>
                  {l.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  links: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
});
