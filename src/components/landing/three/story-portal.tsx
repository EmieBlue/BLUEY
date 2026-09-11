import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';

/**
 * The open page becomes a portal. A runtime-generated radial texture (no asset)
 * swirls on an additive plane, ringed by a glowing torus. `stage.pageEnter`
 * (0..1) grows it from a bright seam on the page to a screen-filling doorway
 * the camera pushes into; it also lingers faintly in the hero universe.
 */
function makePortalTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, PALETTE.goldSoft);
  g.addColorStop(0.5, 'rgba(232,196,107,0.45)');
  g.addColorStop(0.78, 'rgba(18,169,126,0.28)');
  g.addColorStop(1, 'rgba(4,20,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // A few faint swirl arcs for texture.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 24 + i * 20, i, i + 3.2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function StoryPortal({ position = [0, 0.72, -0.2] as [number, number, number] }) {
  const disc = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const discMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(makePortalTexture, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const travel = stage.pageEnter;
    // Small idle presence in the universe once the intro is done.
    const base = stage.done ? 0.12 : 0;
    const scale = THREE.MathUtils.lerp(0.15, 26, travel) + base * 2;

    if (disc.current) {
      disc.current.scale.setScalar(scale);
      disc.current.rotation.z += dt * (0.15 + travel * 1.4);
    }
    if (ring.current) {
      ring.current.scale.setScalar(scale * 0.5);
      ring.current.rotation.z -= dt * (0.2 + travel * 1.1);
    }
    const op = THREE.MathUtils.clamp(travel * 1.4, 0, 1) * (1 - travel * 0.15) + base;
    if (discMat.current) discMat.current.opacity += (op - discMat.current.opacity) * 0.2;
    if (ringMat.current) ringMat.current.opacity += (op * 0.9 - ringMat.current.opacity) * 0.2;
  });

  return (
    <group position={position}>
      <mesh ref={disc}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={discMat}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[1, 0.03, 16, 64]} />
        <meshBasicMaterial
          ref={ringMat}
          color={PALETTE.goldSoft}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
