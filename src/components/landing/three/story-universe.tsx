import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE, STORY_OBJECTS } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { getParticleSprite } from '@/components/landing/three/sprites';
import { StoryObject } from '@/components/landing/three/story-object';

/**
 * The hero: a huge, slowly-turning library of stories in space. Three depth
 * tiers of interactive `StoryObject`s (a few big ones near, more mid, small ones
 * far) plus a `THREE.Points` haze of hundreds of tiny distant "worlds" and a
 * faint central monolith. Everything assembles in on `stage.universe`.
 */
type Props = {
  count: number;
  particleCount: number;
  enabled: boolean;
  pointerFine: boolean;
};

export function StoryUniverse({ count, particleCount, enabled, pointerFine }: Props) {
  const spin = useRef<THREE.Group>(null);

  const placed = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const spec = STORY_OBJECTS[i % STORY_OBJECTS.length];
      const tier = i % 5 === 0 ? 'near' : i % 2 === 0 ? 'mid' : 'far';
      const ring = tier === 'near' ? 6.2 : tier === 'mid' ? 9.5 : 14;
      // Spread around the full circle, but nudge everything off the vertical
      // centre line so the hero headline stays clear.
      let angle = (i / count) * Math.PI * 2 + i * 1.7;
      const cos = Math.cos(angle);
      if (Math.abs(cos) < 0.42) angle += 0.5 * Math.sign(cos || 1);
      const y = Math.sin(i * 2.4) * 3.4 + (i % 2 ? 1.6 : -1.2);
      items.push({
        key: `${spec.title}-${i}`,
        spec,
        position: [Math.cos(angle) * ring, y, Math.sin(angle) * ring - 3] as [number, number, number],
        scale: tier === 'near' ? 1.05 : tier === 'mid' ? 0.78 : 0.5,
      });
    }
    return items;
  }, [count]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    if (spin.current) {
      spin.current.rotation.y += dt * 0.014;
      const a = THREE.MathUtils.clamp(stage.universe, 0, 1);
      spin.current.visible = a > 0.001;
    }
  });

  return (
    <group ref={spin}>
      <DistantWorlds count={particleCount} />
      <Monolith />
      {placed.map((p) => (
        <StoryObject
          key={p.key}
          spec={p.spec}
          position={p.position}
          scale={p.scale}
          enabled={enabled}
          pointerFine={pointerFine}
        />
      ))}
    </group>
  );
}

/** Hundreds of tiny glowing story-worlds far out — one additive Points draw. */
function DistantWorlds({ count }: { count: number }) {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const gold = new THREE.Color(PALETTE.gold);
    const em = new THREE.Color(PALETTE.emeraldSoft);
    for (let i = 0; i < count; i++) {
      const r = 14 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 0.5;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 4;
      const c = Math.random() > 0.5 ? gold : em;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);

  useFrame((state) => {
    if (pts.current) pts.current.rotation.y = state.clock.elapsedTime * 0.006;
    if (mat.current) {
      const target = THREE.MathUtils.clamp(stage.universe, 0, 1) * 0.9;
      mat.current.opacity += (target - mat.current.opacity) * 0.05;
    }
  });

  return (
    <points ref={pts} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        ref={mat}
        map={getParticleSprite()}
        vertexColors
        size={0.2}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** A faint central "great library" — a cluster of dark towers with lit edges. */
function Monolith() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (g.current) g.current.rotation.y += Math.min(delta, 1 / 20) * 0.03;
  });
  return (
    <group ref={g} position={[0, 0.5, -16]}>
      {[
        [0, 0, 0, 2.4, 9, 2.4],
        [2.4, -1, -1, 1.6, 6.4, 1.6],
        [-2.3, -1.6, 0.6, 1.4, 5.2, 1.4],
        [0.4, 3.2, 1.4, 1.1, 3.2, 1.1],
      ].map((b, i) => (
        <group key={i} position={[b[0], b[1], b[2]]}>
          <mesh>
            <boxGeometry args={[b[3], b[4], b[5]]} />
            <meshStandardMaterial
              color={PALETTE.space1}
              emissive={new THREE.Color(PALETTE.emerald)}
              emissiveIntensity={0.04}
              roughness={1}
              metalness={0}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(b[3], b[4], b[5])]} />
            <lineBasicMaterial color={PALETTE.emerald} transparent opacity={0.2} toneMapped={false} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}
