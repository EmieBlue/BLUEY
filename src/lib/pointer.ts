import { Animated, Platform } from 'react-native';

/**
 * A single, app-wide normalized pointer position for parallax / 3D-tilt effects.
 * `x` and `y` range roughly [-1, 1] (screen centre = 0,0).
 *
 * On web a lazy `mousemove` listener springs the value toward the cursor, so any
 * number of components (the depth background, the login card, …) can read the
 * SAME value and move together. On native there's no pointer, so it stays at
 * (0,0) and components fall back to their own gentle auto-motion.
 *
 * Respects `prefers-reduced-motion`: if the viewer asked for less motion we never
 * attach the listener, leaving everything still.
 */
export const pointer = new Animated.ValueXY({ x: 0, y: 0 });

let started = false;

export function ensurePointerTracking(): void {
  if (started) return;
  started = true;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  } catch {
    /* matchMedia may be unavailable; carry on */
  }

  let frame = 0;
  const onMove = (e: MouseEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // Spring toward the cursor for silky, slightly-trailing motion.
      Animated.spring(pointer, {
        toValue: { x: nx, y: ny },
        useNativeDriver: false, // web: JS-driven; transforms still smooth
        speed: 8,
        bounciness: 0,
      }).start();
    });
  };
  window.addEventListener('mousemove', onMove, { passive: true });
}
