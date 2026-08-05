import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type DimensionValue } from 'react-native';

/**
 * A soft, drifting "bokeh" of glowing orbs meant to sit behind a hero (e.g. the
 * login gradient) to make it feel alive. Pure translucency + big radius gives the
 * glow — no blur library needed. Each orb loops its own slow drift + pulse so the
 * motion never looks synchronized. Purely decorative (pointerEvents="none").
 */
type OrbSpec = {
  size: number;
  color: string;
  left: DimensionValue;
  top: DimensionValue;
  drift: number;
  duration: number;
  delay: number;
};

const ORBS: OrbSpec[] = [
  { size: 240, color: 'rgba(15,139,109,0.35)', left: '-8%', top: '6%', drift: 26, duration: 5200, delay: 0 },
  { size: 170, color: 'rgba(59,199,158,0.26)', left: '58%', top: '0%', drift: 22, duration: 6400, delay: 700 },
  { size: 120, color: 'rgba(232,196,107,0.22)', left: '28%', top: '30%', drift: 30, duration: 4800, delay: 400 },
  { size: 210, color: 'rgba(15,139,109,0.26)', left: '62%', top: '52%', drift: 24, duration: 7000, delay: 1200 },
  { size: 95, color: 'rgba(232,196,107,0.24)', left: '8%', top: '60%', drift: 34, duration: 5600, delay: 300 },
  { size: 150, color: 'rgba(59,199,158,0.2)', left: '82%', top: '28%', drift: 20, duration: 6000, delay: 900 },
  { size: 110, color: 'rgba(255,255,255,0.1)', left: '38%', top: '74%', drift: 28, duration: 5000, delay: 600 },
];

function Orb({ size, color, left, top, drift, duration, delay }: OrbSpec) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, delay, useNativeDriver }),
        Animated.timing(t, { toValue: 0, duration, useNativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [t, duration, delay]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drift * 0.4, drift * 0.4] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

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
        opacity,
      }}
    />
  );
}

export function AnimatedOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((o, i) => (
        <Orb key={i} {...o} />
      ))}
    </View>
  );
}
