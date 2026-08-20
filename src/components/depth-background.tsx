import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type DimensionValue } from 'react-native';

import { ensurePointerTracking, pointer } from '@/lib/pointer';

/**
 * A 3D "diorama" backdrop: real book covers floating at different depths behind
 * the content, plus soft glow clouds for atmosphere. Near covers are bigger,
 * sharper and parallax-shift more; far ones are smaller, fainter and blurred.
 *
 * Motion comes from two sources that stack:
 *  - each cover slowly self-drifts (an Animated loop) so it's alive with no input;
 *  - on web, every layer additionally parallax-shifts against the shared cursor
 *    `pointer` by its depth, which reads as real 3D. On native there's no pointer,
 *    so only the gentle self-drift shows.
 *
 * Purely decorative — never intercepts touches.
 */
const isWeb = Platform.OS === 'web';

type Slot = {
  left: DimensionValue;
  top: DimensionValue;
  /** 0 = far (small, faint, blurred), 1 = near (big, sharp, moves most). */
  depth: number;
  size: number;
  drift: number;
  duration: number;
  delay: number;
  rot: number;
};

const LOGIN_SLOTS: Slot[] = [
  { left: '4%', top: '10%', depth: 0.95, size: 150, drift: 20, duration: 6200, delay: 0, rot: 4 },
  { left: '72%', top: '6%', depth: 0.55, size: 118, drift: 26, duration: 7400, delay: 600, rot: 6 },
  { left: '80%', top: '54%', depth: 0.8, size: 138, drift: 22, duration: 6800, delay: 300, rot: 5 },
  { left: '1%', top: '60%', depth: 0.4, size: 104, drift: 30, duration: 8000, delay: 900, rot: 7 },
  { left: '39%', top: '1%', depth: 0.25, size: 88, drift: 24, duration: 7000, delay: 400, rot: 5 },
  { left: '46%', top: '80%', depth: 0.65, size: 120, drift: 28, duration: 7600, delay: 1200, rot: 6 },
];

const HOME_SLOTS: Slot[] = [
  { left: '-4%', top: '8%', depth: 0.5, size: 128, drift: 22, duration: 8200, delay: 0, rot: 5 },
  { left: '78%', top: '20%', depth: 0.7, size: 138, drift: 24, duration: 7600, delay: 700, rot: 6 },
  { left: '60%', top: '70%', depth: 0.35, size: 100, drift: 28, duration: 9000, delay: 1100, rot: 5 },
];

type Glow = { size: number; color: string; left: DimensionValue; top: DimensionValue; drift: number; duration: number; delay: number };
const GLOWS: Glow[] = [
  { size: 320, color: 'rgba(15,139,109,0.30)', left: '-12%', top: '2%', drift: 26, duration: 6000, delay: 0 },
  { size: 260, color: 'rgba(232,196,107,0.16)', left: '66%', top: '4%', drift: 22, duration: 7200, delay: 700 },
  { size: 300, color: 'rgba(15,139,109,0.24)', left: '58%', top: '58%', drift: 24, duration: 7800, delay: 1200 },
  { size: 200, color: 'rgba(59,199,158,0.18)', left: '4%', top: '64%', drift: 30, duration: 6600, delay: 400 },
];

function useDrift(duration: number, delay: number) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const useNativeDriver = !isWeb;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, delay, useNativeDriver }),
        Animated.timing(t, { toValue: 0, duration, useNativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [t, duration, delay]);
  return t;
}

function GlowCloud({ size, color, left, top, drift, duration, delay }: Glow) {
  const t = useDrift(duration, delay);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drift * 0.4, drift * 0.4] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

function FloatingCover({ uri, slot, subtle }: { uri: string; slot: Slot; subtle?: boolean }) {
  const t = useDrift(slot.duration, slot.delay);
  const { depth } = slot;

  const driftY = t.interpolate({ inputRange: [0, 1], outputRange: [slot.drift, -slot.drift] });
  const driftX = t.interpolate({ inputRange: [0, 1], outputRange: [-slot.drift * 0.5, slot.drift * 0.5] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`-${slot.rot}deg`, `${slot.rot}deg`] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });

  // Parallax: nearer covers (higher depth) move more, opposite the cursor, for a
  // "looking through a window" feel. Web only — on native `pointer` stays at 0.
  const maxShift = (subtle ? 26 : 46) * depth;
  const px = pointer.x.interpolate({ inputRange: [-1, 1], outputRange: [maxShift, -maxShift] });
  const py = pointer.y.interpolate({ inputRange: [-1, 1], outputRange: [maxShift, -maxShift] });

  const transform = isWeb
    ? [
        { perspective: 900 },
        { translateX: Animated.add(driftX, px) },
        { translateY: Animated.add(driftY, py) },
        { rotate },
        { scale },
      ]
    : [{ translateX: driftX }, { translateY: driftY }, { rotate }, { scale }];

  const opacity = (subtle ? 0.16 + depth * 0.28 : 0.4 + depth * 0.5);
  const blurRadius = Math.round((1 - depth) * (subtle ? 14 : 9));
  const w = slot.size;
  const h = Math.round(w * 1.4);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: slot.left,
        top: slot.top,
        width: w,
        height: h,
        opacity,
        borderRadius: 12,
        // Depth shadow — stronger for nearer covers.
        shadowColor: '#000',
        shadowOpacity: 0.35 * depth,
        shadowRadius: 24 * depth,
        shadowOffset: { width: 0, height: 14 * depth },
        transform,
      }}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%', borderRadius: 12 }}
        contentFit="cover"
        blurRadius={blurRadius}
        transition={300}
      />
    </Animated.View>
  );
}

export function DepthBackground({ covers = [], subtle }: { covers?: string[]; subtle?: boolean }) {
  useEffect(() => {
    ensurePointerTracking();
  }, []);

  const clean = covers.filter(Boolean);
  const slots = subtle ? HOME_SLOTS : LOGIN_SLOTS;
  // Map covers onto slots, cycling if there are fewer covers than slots so the
  // arrangement always looks full. With no covers, we still show the glow haze.
  const filled = clean.length >= 2 ? slots.map((s, i) => ({ slot: s, uri: clean[i % clean.length] })) : [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {GLOWS.map((g, i) => (
        <GlowCloud key={`g${i}`} {...g} />
      ))}
      {filled.map(({ slot, uri }, i) => (
        <FloatingCover key={`c${i}`} uri={uri} slot={slot} subtle={subtle} />
      ))}
    </View>
  );
}
