import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { WORLD_FRAGMENTS, type WorldFragmentSpec } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';

/**
 * Scene 4 — the flight through the pages. Rather than six full sets, each world
 * is a shallow diorama of silhouettes over a graded backdrop, stacked at the
 * same spot and cross-faded as `stage.worldIndex` (0..N) sweeps past. They read
 * like half-remembered fragments, which is the intent. Only mounted during the
 * `worlds` phase by the parent, and capped by tier (`limit`).
 */
export function WorldFragments({ limit = 6 }: { limit?: number }) {
  const specs = WORLD_FRAGMENTS.slice(0, limit);
  return (
    <group position={[0, 0.4, 0]}>
      {specs.map((spec, i) => (
        <Fragment key={spec.key} spec={spec} index={i} />
      ))}
    </group>
  );
}

function gradeTexture([a, b]: [string, string]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Fragment({ spec, index }: { spec: WorldFragmentSpec; index: number }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.Material[]>([]);
  const tex = useMemo(() => gradeTexture(spec.grade), [spec.grade]);
  const accent = useMemo(() => new THREE.Color(spec.accent), [spec.accent]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    // Triangular window: fully visible when worldIndex === index.
    const d = Math.abs(stage.worldIndex - index);
    const vis = THREE.MathUtils.clamp(1 - d * 1.35, 0, 1);
    const op = vis * vis;

    mats.current.forEach((m) => {
      const mm = m as THREE.Material & { opacity: number };
      mm.opacity += (op - mm.opacity) * 0.25;
    });
    if (group.current) {
      group.current.visible = op > 0.01 || vis > 0.01;
      group.current.position.z = -12 + (1 - vis) * -6; // recede as it fades
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2 + index) * 0.05;
      group.current.position.x = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.3;
    }
  });

  const register = (m: THREE.Material | null) => {
    if (m && !mats.current.includes(m)) {
      (m as THREE.Material).transparent = true;
      (m as THREE.Material & { opacity: number }).opacity = 0;
      mats.current.push(m);
    }
  };

  return (
    <group ref={group} position={[0, 0, -12]}>
      {/* Graded backdrop */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[40, 22]} />
        <meshBasicMaterial ref={register} map={tex} toneMapped={false} depthWrite={false} />
      </mesh>
      <Silhouettes kind={spec.key} accent={accent} register={register} />
    </group>
  );
}

function Silhouettes({
  kind,
  accent,
  register,
}: {
  kind: string;
  accent: THREE.Color;
  register: (m: THREE.Material | null) => void;
}) {
  const dark = <meshBasicMaterial ref={register} color="#05100c" depthWrite={false} />;
  const lit = <meshBasicMaterial ref={register} color={accent} toneMapped={false} depthWrite={false} />;

  switch (kind) {
    case 'castle':
      return (
        <group position={[0, -2, 0]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[4, 4, 1]} />
            {dark}
          </mesh>
          <mesh position={[-2.4, 3, 0]}>
            <boxGeometry args={[1.1, 6, 1]} />
            {dark}
          </mesh>
          <mesh position={[2.4, 3.4, 0]}>
            <boxGeometry args={[1.1, 6.8, 1]} />
            {dark}
          </mesh>
          <mesh position={[0, 0.2, 1]}>
            <boxGeometry args={[9, 0.5, 0.5]} />
            {lit}
          </mesh>
        </group>
      );
    case 'forest':
      return (
        <group position={[0, -3, 0]}>
          {[-4, -2, 0.5, 3, 5].map((x, i) => (
            <mesh key={i} position={[x, 1.5 + (i % 2), 0]}>
              <coneGeometry args={[1.1, 4 + (i % 2), 7]} />
              {i % 2 ? lit : dark}
            </mesh>
          ))}
        </group>
      );
    case 'comic':
      return (
        <group>
          {[
            [-3.2, 1.4, 0.3],
            [1.5, 2, -0.4],
            [3, -1.6, 0.2],
            [-1.5, -2, -0.3],
          ].map((p, i) => (
            <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[0, 0, (i - 1.5) * 0.2]}>
              <planeGeometry args={[3.4, 2.4]} />
              {i % 2 ? lit : dark}
            </mesh>
          ))}
        </group>
      );
    case 'romance':
      return (
        <group position={[0, -1.5, 0]}>
          <mesh position={[-0.9, 0, 0]}>
            <capsuleGeometry args={[0.4, 1.6, 4, 12]} />
            {dark}
          </mesh>
          <mesh position={[0.9, 0, 0]}>
            <capsuleGeometry args={[0.4, 1.6, 4, 12]} />
            {dark}
          </mesh>
          <mesh position={[0, 3, -1]}>
            <sphereGeometry args={[1.4, 16, 16]} />
            {lit}
          </mesh>
        </group>
      );
    case 'future':
      return (
        <group position={[0, -3, 0]}>
          {[-4, -2.4, -0.8, 1, 2.6, 4.2].map((x, i) => (
            <mesh key={i} position={[x, 2 + (i % 3), 0]}>
              <boxGeometry args={[0.8, 5 + (i % 3) * 2, 0.8]} />
              {dark}
            </mesh>
          ))}
          <mesh position={[0, 4, 1]}>
            <torusGeometry args={[2.2, 0.05, 8, 40]} />
            {lit}
          </mesh>
        </group>
      );
    case 'cinema':
    default:
      return (
        <group>
          <mesh>
            <planeGeometry args={[16, 7]} />
            {dark}
          </mesh>
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[15, 0.06]} />
            {lit}
          </mesh>
          <mesh position={[-2, -0.4, 0.2]}>
            <capsuleGeometry args={[0.3, 1.1, 4, 10]} />
            {lit}
          </mesh>
        </group>
      );
  }
}
