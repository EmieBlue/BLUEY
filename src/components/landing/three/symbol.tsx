import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { ASSET_URL, useOptionalTexture } from '@/lib/landing-assets';

/** A simple N-pointed star/sparkle outline — used as the procedural fallback. */
function starShape(outerR: number, innerR: number, points = 4): THREE.Shape {
  const shape = new THREE.Shape();
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * The recurring glowing 4-point symbol from the reference art. Renders the
 * real `symbol.png` (a transparent billboard plane) once the user drops one
 * into `public/landing/`; otherwise a procedural sparkle shape — same slow
 * spin + pulse either way. Used on the book cover emblem and as a subtle
 * accent on portals / hero objects.
 */
export function StorySymbol({
  size = 0.32,
  color = PALETTE.gold,
  spin = true,
  billboard = false,
  visibleWhen,
}: {
  size?: number;
  color?: string;
  spin?: boolean;
  /** Always face the camera — for accents on rotating/drifting objects. */
  billboard?: boolean;
  /** Live getter (reads `stage` directly) — hides the symbol when it returns false. */
  visibleWhen?: () => boolean;
}) {
  const texture = useOptionalTexture(ASSET_URL.symbol);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.Material & { opacity: number }>(null);
  const geo = useMemo(() => new THREE.ShapeGeometry(starShape(1, 0.42)), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      if (billboard) group.current.quaternion.copy(state.camera.quaternion);
      if (spin && !billboard) group.current.rotation.z = t * 0.25;
      group.current.visible = visibleWhen ? visibleWhen() : true;
    }
    if (mat.current) mat.current.opacity = 0.7 + Math.sin(t * 2) * 0.18;
  });

  return (
    <group ref={group} scale={size}>
      {texture ? (
        <mesh scale={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={mat}
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : (
        <mesh geometry={geo}>
          <meshBasicMaterial
            ref={mat}
            color={color}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
