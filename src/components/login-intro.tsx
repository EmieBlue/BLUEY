import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/wordmark';

/**
 * A short cinematic "starter" for the login (inspired by kaedano.app):
 *  1. the Bluey logo glows to life while a gold beam sweeps over it (like
 *     setting up a fingerprint),
 *  2. a row of book covers fans up underneath (Wattpad-"Trending"-style — the
 *     "second & third images"),
 *  3. the whole layer fades away to reveal the sign-in card.
 * Tap anywhere to skip. Calls `onDone` once it finishes fading.
 */
const NATIVE = Platform.OS !== 'web';
const LOGO = require('@/assets/images/elyra-mark.png');

export function LoginIntro({ onDone, covers = [] }: { onDone: () => void; covers?: string[] }) {
  const scan = useRef(new Animated.Value(0)).current; // 0..1 logo scan
  const shelf = useRef(new Animated.Value(0)).current; // 0..1 covers fan-in
  const fade = useRef(new Animated.Value(1)).current; // overlay opacity
  const finished = useRef(false);
  const shown = covers.filter(Boolean).slice(0, 3);

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      Animated.timing(fade, { toValue: 0, duration: 520, useNativeDriver: NATIVE }).start(() =>
        onDone(),
      );
    };
    const steps: Animated.CompositeAnimation[] = [
      Animated.timing(scan, { toValue: 1, duration: 1400, useNativeDriver: NATIVE }),
    ];
    if (shown.length) {
      steps.push(Animated.timing(shelf, { toValue: 1, duration: 850, useNativeDriver: NATIVE }));
      steps.push(Animated.delay(550));
    }
    Animated.sequence(steps).start(({ finished: ok }) => ok && finish());
    const t = setTimeout(finish, shown.length ? 4000 : 2600); // safety net
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (finished.current) return;
    finished.current = true;
    scan.setValue(1);
    shelf.setValue(1);
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: NATIVE }).start(() =>
      onDone(),
    );
  };

  const logoOpacity = scan.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.35, 0.75, 1] });
  const logoScale = scan.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const beamY = scan.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-96, 96, -96] });
  const beamOpacity = scan.interpolate({ inputRange: [0, 0.06, 0.9, 1], outputRange: [0, 1, 1, 0] });

  const coverStyle = (i: number) => {
    const start = 0.05 + i * 0.22;
    const end = Math.min(0.98, start + 0.5);
    return {
      opacity: shelf.interpolate({ inputRange: [0, start, end, 1], outputRange: [0, 0, 1, 1] }),
      transform: [
        { translateY: shelf.interpolate({ inputRange: [0, start, end, 1], outputRange: [28, 28, 0, 0] }) },
      ],
    };
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]}>
      <Animated.View
        style={[styles.logoBox, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Animated.View
          pointerEvents="none"
          style={[styles.beam, { opacity: beamOpacity, transform: [{ translateY: beamY }] }]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(232,196,107,0.0)',
              'rgba(232,196,107,0.55)',
              'rgba(247,226,156,0.95)',
              'rgba(232,196,107,0.55)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={{ marginTop: 6, opacity: scan.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1] }) }}>
        <Wordmark size={32} color="#FFFFFF" />
      </Animated.View>

      {shown.length > 0 && (
        <View style={styles.shelfRow}>
          {shown.map((uri, i) => (
            <Animated.View key={uri + i} style={[styles.cover, coverStyle(i)]}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          ))}
        </View>
      )}

      {/* transparent tap-to-skip layer on top */}
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#04140F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  logoBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 156, height: 156 },
  beam: { position: 'absolute', left: 0, right: 0, height: 46 },
  shelfRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cover: {
    width: 86,
    height: 124,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0C2A22',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});
