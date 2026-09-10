import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { getParticleSprite } from '@/components/landing/three/sprites';

/**
 * One reusable particle system for every sparkle in the cinematic:
 *  - `orbit`  → a slow halo circling a point (the book's aura, universe motes)
 *  - `rise`   → embers / letter-fragments floating upward out of the open book
 *  - `burst`  → an outward explosion whose radius follows `intensity`
 *
 * CPU-animated `THREE.Points` — counts stay small (≤ ~500) so it's effectively
 * free. `intensity` is a 0..1 value you feed from `stage` each render.
 */
export type ParticleBehavior = 'orbit' | 'rise' | 'burst';

type Props = {
  count?: number;
  color?: string;
  size?: number;
  /** Base radius of the effect in world units. */
  radius?: number;
  behavior?: ParticleBehavior;
  /**
   * 0..1 strength. Pass a GETTER (`() => stage.book.open`) when the value changes
   * every frame — a plain number is only read once at mount.
   */
  intensity: number | (() => number);
  position?: [number, number, number];
};

export function MagicParticles({
  count = 160,
  color = '#E8C46B',
  size = 0.06,
  radius = 1.4,
  behavior = 'orbit',
  intensity,
  position = [0, 0, 0],
}: Props) {
  const points = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(getParticleSprite, []);

  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count * 4); // per-particle: angle, radius, speed, yPhase
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = radius * (0.3 + Math.random() * 0.9);
      s[i * 4] = angle;
      s[i * 4 + 1] = rad;
      s[i * 4 + 2] = 0.3 + Math.random() * 1.2;
      s[i * 4 + 3] = Math.random();
      pos[i * 3] = Math.cos(angle) * rad;
      pos[i * 3 + 1] = (Math.random() - 0.5) * radius;
      pos[i * 3 + 2] = Math.sin(angle) * rad;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geometry: g, seeds: s };
  }, [count, radius]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const raw = typeof intensity === 'function' ? intensity() : intensity;
    const k = THREE.MathUtils.clamp(raw, 0, 1);
    const arr = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const a0 = seeds[i * 4];
      const rad = seeds[i * 4 + 1];
      const spd = seeds[i * 4 + 2];
      const yPh = seeds[i * 4 + 3];

      if (behavior === 'orbit') {
        const a = a0 + t * spd * 0.4;
        arr[i * 3] = Math.cos(a) * rad;
        arr[i * 3 + 1] = Math.sin(t * spd + yPh * 6) * radius * 0.5;
        arr[i * 3 + 2] = Math.sin(a) * rad;
      } else if (behavior === 'rise') {
        const life = (t * spd * 0.35 + yPh) % 1;
        arr[i * 3] = Math.cos(a0 + life * 3) * rad * (0.4 + life * 0.6);
        arr[i * 3 + 1] = -radius * 0.4 + life * radius * 3;
        arr[i * 3 + 2] = Math.sin(a0 + life * 3) * rad * (0.4 + life * 0.6);
      } else {
        // burst
        const rr = rad * (0.2 + k * 2.4);
        const a = a0 + t * spd * 0.2;
        const tilt = yPh * Math.PI - Math.PI / 2;
        arr[i * 3] = Math.cos(a) * Math.cos(tilt) * rr;
        arr[i * 3 + 1] = Math.sin(tilt) * rr;
        arr[i * 3 + 2] = Math.sin(a) * Math.cos(tilt) * rr;
      }
    }
    geometry.attributes.position.needsUpdate = true;

    if (matRef.current) {
      const target = behavior === 'burst' ? k : k * 0.9;
      matRef.current.opacity += (target - matRef.current.opacity) * (behavior === 'burst' ? 0.4 : 0.06);
    }
    if (points.current) points.current.rotation.y += dt * 0.05;
  });

  return (
    <points ref={points} geometry={geometry} position={position} frustumCulled={false}>
      <pointsMaterial
        ref={matRef}
        map={sprite}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
