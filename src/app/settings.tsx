import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME } from '@/config/app';
import { MaxContentWidth, Spacing, THEMES } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useThemeMode } from '@/context/theme';
import { useTheme } from '@/hooks/use-theme';
import { enablePush, pushPermission, pushSupported } from '@/lib/push';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { themeKey, setThemeKey } = useThemeMode();
  const { user, configured, signOut } = useAuth();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email || '';

  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(pushPermission() === 'granted');
  const onEnableNotifs = async () => {
    setNotifBusy(true);
    setNotifMsg(null);
    const r = await enablePush();
    setNotifBusy(false);
    if (r.ok) {
      setNotifGranted(true);
      setNotifMsg('You’re all set — we’ll let you know when new stories arrive.');
    } else {
      setNotifMsg(r.error || 'Could not turn on notifications.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">Settings</ThemedText>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Appearance */}
          <View style={styles.section}>
            <SectionHeader title="Appearance" subtitle="Pick a theme" />
            <View style={styles.themeRow}>
              {THEMES.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setThemeKey(t.key)}
                  style={[
                    styles.themeChip,
                    { backgroundColor: themeKey === t.key ? theme.accent : theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: themeKey === t.key ? theme.accentOn : theme.text }}>
                    {t.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Account */}
          <View style={styles.section}>
            <SectionHeader title="Account" />
            {user ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                    <ThemedText style={[styles.avatarText, { color: theme.accentOn }]}>
                      {displayName.charAt(0).toUpperCase() || '?'}
                    </ThemedText>
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {displayName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Signed in
                    </ThemedText>
                  </View>
                </View>
                <Pressable onPress={() => signOut()} hitSlop={8}>
                  <ThemedText type="smallBold" themeColor="accent">
                    Sign out
                  </ThemedText>
                </Pressable>
              </View>
            ) : configured ? (
              <Pressable
                onPress={() => router.push('/auth')}
                style={({ pressed }) => [
                  styles.signInBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                  Sign in or create an account
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Accounts aren’t connected yet.
              </ThemedText>
            )}
          </View>

          {/* Notifications */}
          {pushSupported() && (
            <View style={styles.section}>
              <SectionHeader title="Notifications" subtitle="Get alerted when new stories arrive" />
              {notifGranted ? (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.cardRow}>
                    <Ionicons name="notifications" size={20} color={theme.accent} />
                    <ThemedText type="small" style={styles.flex}>
                      Notifications are on for this device.
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={onEnableNotifs}
                  disabled={notifBusy}
                  style={({ pressed }) => [
                    styles.signInBtn,
                    { backgroundColor: theme.accent, opacity: notifBusy ? 0.6 : pressed ? 0.85 : 1 },
                  ]}>
                  {notifBusy ? (
                    <ActivityIndicator color={theme.accentOn} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                      Turn on notifications
                    </ThemedText>
                  )}
                </Pressable>
              )}
              {notifMsg ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {notifMsg}
                </ThemedText>
              ) : null}
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            {APP_NAME} · v1.0
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  themeChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  signInBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footer: { textAlign: 'center', marginTop: Spacing.three },
});
