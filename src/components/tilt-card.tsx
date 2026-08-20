import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ensurePointerTracking, pointer } from '@/lib/pointer';

/**
 * Wraps a card so it feels like a physical pane floating in 3D. On web it tilts
 * in perspective toward the cursor (shared `pointer`) with a specular glare that
 * sweeps across the glass; on native it does a slow, gentle auto-tilt so it still
 * "breathes". Reduced-motion viewers keep `pointer` at 0 → the card sits still.
 */
const isWeb = Platform.OS === 'web';

export function TiltCard({
  children,
  style,
  radius = 24,
  maxTilt = 7,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  maxTilt?: number;
}) {
  const auto = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ensurePointerTracking();
    if (isWeb) return; // native: gentle auto-tilt loop
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(auto, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(auto, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [auto]);

  const rotateY = isWeb
    ? pointer.x.interpolate({ inputRange: [-1, 1], outputRange: [`-${maxTilt}deg`, `${maxTilt}deg`] })
    : auto.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] });
  const rotateX = isWeb
    ? pointer.y.interpolate({ inputRange: [-1, 1], outputRange: [`${maxTilt}deg`, `-${maxTilt}deg`] })
    : auto.interpolate({ inputRange: [0, 1], outputRange: ['1.5deg', '-1.5deg'] });
  const glareShift = isWeb
    ? pointer.x.interpolate({ inputRange: [-1, 1], outputRange: [-34, 34] })
    : auto.interpolate({ inputRange: [0, 1], outputRange: [-24, 24] });

  return (
    <Animated.View
      style={[{ transform: [{ perspective: 1000 }, { rotateX }, { rotateY }] }, style]}>
      {children}
      {/* Specular glass glare, clipped to the card's rounded rect. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.glare, { transform: [{ translateX: glareShift }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
            locations={[0.28, 0.5, 0.72]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Slightly over-wide so the sheen has room to slide without exposing an edge.
  glare: { left: '-15%', right: '-15%' },
});
