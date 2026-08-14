import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Fades + slides its children up once `active` becomes true. Give siblings
 * increasing `delay`s to get a staggered cascade (used by the login after its
 * intro animation finishes).
 */
export function Reveal({
  active = true,
  delay = 0,
  y = 16,
  duration = 480,
  style,
  children,
}: {
  active?: boolean;
  delay?: number;
  y?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [active, delay, duration, v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
