import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { WORLD_FRAGMENTS, type WorldFragmentSpec } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { ASSET_URL, useOptionalTexture } from '@/lib/landing-assets';

/**
 * The `worldMorph` phase — the page becomes castle, then forest, then comic
 * panels, then a video scene. Each world is a backdrop plane stacked at the
 * same spot, cross-dissolving as `stage.worldIndex` (0..4) sweeps past — reads
 * as one world *transforming into* the next, not a slideshow. Renders the real
 * `/landing/world-<key>.jpg` once the user drops one in; otherwise a graded
 * gradient + procedural silhouettes. Only mounted during `worldMorph` by the
 * parent, and capped by tier (`limit`).
 */
export function WorldFragments({ limit = 4 }: { limit?: number }) {
  const specs = WORLD_FRAGMENTS.slice(0, limit);
  return (
    <group position={[0, 0.4, 0]}>
      {specs.map((spec, i) => (
        <Fragment key={spec.key} spec={spec} index={i} />
      ))}
    </group>
  );
}

let cachedHalo: THREE.CanvasTexture | null = null;
/** A soft radial falloff (white center -> transparent edge) for the glow behind an art panel. */
function haloTexture(): THREE.CanvasTexture {
  if (cachedHalo) return cachedHalo;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  cachedHalo = new THREE.CanvasTexture(c);
  return cachedHalo;
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

// Reference art dropped in so far is portrait (phone-shaped crops of the
// original concept art), not the wide landscape shape of the procedural
// backdrop — so a real texture is CONTAINED at its own aspect ratio inside
// this box (a floating painted panel) rather than stretched to fill 40x22.
// Sized to comfortably fit the camera's frustum at the range it's actually
// viewed from during worldMorph (~9-14 world units away, fov 58°) with margin
// to spare — not to fill the screen edge-to-edge.
const ART_MAX_W = 6.5;
const ART_MAX_H = 8.5;
const FALLBACK_SIZE: [number, number] = [40, 22];

function Fragment({ spec, index }: { spec: WorldFragmentSpec; index: number }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.Material[]>([]);
  const haloMat = useRef<THREE.Material & { opacity: number }>(null);
  const gradient = useMemo(() => gradeTexture(spec.grade), [spec.grade]);
  const accent = useMemo(() => new THREE.Color(spec.accent), [spec.accent]);
  const art = useOptionalTexture(ASSET_URL.world(spec.key));

  const [planeW, planeH] = useMemo(() => {
    const img = art?.image as { width?: number; height?: number } | undefined;
    if (!art || !img?.width || !img?.height) return FALLBACK_SIZE;
    const aspect = img.width / img.height;
    let w = ART_MAX_W;
    let h = w / aspect;
    if (h > ART_MAX_H) {
      h = ART_MAX_H;
      w = h * aspect;
    }
    return [w, h] as [number, number];
  }, [art]);

  useFrame((state) => {
    // Triangular window: fully visible when worldIndex === index.
    const d = Math.abs(stage.worldIndex - index);
    const vis = THREE.MathUtils.clamp(1 - d * 1.1, 0, 1);
    const op = vis * vis;

    mats.current.forEach((m) => {
      const mm = m as THREE.Material & { opacity: number };
      mm.opacity += (op - mm.opacity) * 0.2;
    });
    // The halo is a soft accent behind the art, not another full-strength layer —
    // capped well below the panel's own opacity so it can't wash the image out.
    if (haloMat.current) haloMat.current.opacity += (op * 0.22 - haloMat.current.opacity) * 0.2;
    if (group.current) {
      group.current.visible = op > 0.01 || vis > 0.01;
      group.current.position.z = -12 + (1 - vis) * -6; // recede as it fades
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15 + index) * 0.04;
      group.current.position.x = Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.25;
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
      {art ? (
        <>
          {/* Soft accent-tinted glow behind the panel, like a lit frame — kept out of
              `mats`/`register` so it can be capped to its own, much lower opacity. */}
          <mesh position={[0, 0, -0.15]} scale={[planeW * 1.2, planeH * 1.2, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={haloMat}
              map={haloTexture()}
              color={accent}
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh>
            <planeGeometry args={[planeW, planeH]} />
            <meshBasicMaterial ref={register} map={art} toneMapped={false} depthWrite={false} />
          </mesh>
        </>
      ) : (
        <>
          {/* No art yet — full-bleed graded gradient + procedural silhouettes */}
          <mesh position={[0, 0, -3]}>
            <planeGeometry args={FALLBACK_SIZE} />
            <meshBasicMaterial ref={register} map={gradient} toneMapped={false} depthWrite={false} />
          </mesh>
          <Silhouettes kind={spec.key} accent={accent} register={register} />
        </>
      )}
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
    case 'video':
    default:
      // A dramatic, cinematic "story caught mid-scene" — a lit horizon line and
      // a couple of silhouetted figures.
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
          <mesh position={[1.8, -0.5, 0.2]}>
            <capsuleGeometry args={[0.28, 1, 4, 10]} />
            {dark}
          </mesh>
        </group>
      );
  }
}
