import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

export function WalkingArrow({
  direction = 'back', active = false, disabled = false, color,
}: {
  direction?: 'back' | 'forward';
  active?: boolean;
  disabled?: boolean;
  color: string;
}) {
  const stride = useRef(new Animated.Value(0.25)).current;
  const introduced = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReducedMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; subscription?.remove(); };
  }, []);

  useEffect(() => {
    if (reducedMotion || disabled) {
      stride.setValue(0.25);
      return;
    }
    const timing = { useNativeDriver: Platform.OS !== 'web', isInteraction: false };
    // Two greeting steps on entry also make the motion discoverable on touchscreens.
    if (active || !introduced.current) {
      introduced.current = true;
      stride.setValue(0);
      const walk = Animated.loop(Animated.timing(stride, {
        ...timing, toValue: 1, duration: 850, easing: Easing.linear,
      }), { iterations: active ? -1 : 2 });
      walk.start();
      return () => walk.stop();
    }
    const settle = Animated.timing(stride, { ...timing, toValue: 0.25, duration: 120 });
    settle.start();
    return () => settle.stop();
  }, [active, disabled, reducedMotion, stride]);

  const swing = (reverse: boolean) => stride.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: reverse ? ['28deg', '8deg', '-28deg', '8deg', '28deg'] : ['-28deg', '-8deg', '28deg', '-8deg', '-28deg'],
  });
  const ink = { backgroundColor: color };
  return (
    <View
      aria-hidden
      accessible={false}
      pointerEvents="none"
      testID={`walking-arrow-${direction}`}
      style={[styles.scene, direction === 'forward' && styles.forward]}>
      <View style={styles.arrow}><Ionicons name="arrow-back" size={12} color={color} /></View>
      <View style={[styles.ground, ink]} />
      <Animated.View style={[styles.figure, {
        transform: [{ translateY: stride.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -0.8, 0, -0.8, 0] }) }],
      }]}>
        <View style={[styles.head, { borderColor: color }]}><View style={[styles.eye, ink]} /></View>
        <View style={[styles.body, ink]} />
        <Animated.View style={[styles.arm, styles.far, ink, { transform: [{ rotate: swing(true) }] }]} />
        <Animated.View style={[styles.leg, styles.far, ink, { transform: [{ rotate: swing(false) }] }]}>
          <View style={[styles.foot, ink]} />
        </Animated.View>
        <Animated.View style={[styles.arm, ink, { transform: [{ rotate: swing(false) }] }]} />
        <Animated.View testID="walking-leg" style={[styles.leg, ink, { transform: [{ rotate: swing(true) }] }]}>
          <View style={[styles.foot, ink]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: 34, height: 30, flexShrink: 0 },
  forward: { transform: [{ scaleX: -1 }] },
  arrow: { position: 'absolute', left: 0, top: 9 },
  ground: { position: 'absolute', left: 12, bottom: 1, width: 20, height: 1, opacity: 0.18 },
  figure: { position: 'absolute', top: 1, left: 12, width: 20, height: 27 },
  head: { position: 'absolute', left: 6, top: 0, width: 7, height: 7, borderWidth: 1.6, borderRadius: 4 },
  eye: { position: 'absolute', top: 1.3, left: 0.3, width: 1.3, height: 1.3, borderRadius: 1 },
  body: { position: 'absolute', left: 8.7, top: 6, width: 1.8, height: 10, borderRadius: 1 },
  arm: { position: 'absolute', left: 8.7, top: 9, width: 1.8, height: 8, borderRadius: 1, transformOrigin: 'top center' },
  leg: { position: 'absolute', left: 8.7, top: 15, width: 1.8, height: 10, borderRadius: 1, transformOrigin: 'top center' },
  foot: { position: 'absolute', right: 0, bottom: 0, width: 4, height: 1.8, borderRadius: 1 },
  far: { opacity: 0.45 },
});
