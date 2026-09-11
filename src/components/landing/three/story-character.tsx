import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { ASSET_URL, useOptionalTexture } from '@/lib/landing-assets';

/**
 * The story explorer — she's already standing near the floating book when the
 * cinematic opens (no more walk-in). Reads `stage.character`:
 *   appear 0..1 → fade in/out (also used for the pull-out reappearance)
 *   focus  0..1 → she notices/turns toward the book — a subtle lean, a brighter
 *                 glow on her coat's symbol, not a walk cycle
 *
 * Renders the real `character.png` as a soft rim-lit cutout once the user
 * drops one into `public/landing/`; otherwise an original stylized silhouette
 * built from primitives. To use a real rigged model later: load a GLTF +
 * `useAnimations` in place of <ProceduralFigure/>, keeping this file's
 * position/appear/focus wiring.
 */
const POSITION: [number, number, number] = [-1.85, -0.82, 0.5];

export function StoryCharacter() {
  const root = useRef<THREE.Group>(null);
  const texture = useOptionalTexture(ASSET_URL.character);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { appear, focus } = stage.character;
    if (root.current) {
      root.current.visible = appear > 0.001;
      root.current.position.y = POSITION[1] + Math.sin(t * 0.6) * 0.02;
      // A gentle turn toward the book as she "notices" it.
      root.current.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.56, Math.PI * 0.42, focus);
    }
  });

  return (
    <group ref={root} position={POSITION} rotation={[0, Math.PI / 2, 0]}>
      {texture ? <BillboardFigure texture={texture} /> : <ProceduralFigure />}
    </group>
  );
}

/** Textured cutout, softly rim-lit — turns with the group like the procedural figure. */
function BillboardFigure({ texture }: { texture: THREE.Texture }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const img = texture.image as { width?: number; height?: number } | undefined;
  const aspect = (img?.height ?? 1) / (img?.width ?? 1) || 1.5;
  const width = 1.5;

  useFrame((state) => {
    const { appear, focus } = stage.character;
    const t = state.clock.elapsedTime;
    if (mat.current) mat.current.opacity = THREE.MathUtils.clamp(appear, 0, 1);
    if (glowMat.current) glowMat.current.opacity = THREE.MathUtils.clamp(appear, 0, 1) * (0.18 + focus * 0.22);
    if (glow.current) glow.current.scale.setScalar(1.06 + Math.sin(t * 1.4) * 0.01);
  });

  return (
    <group position={[0, (width * aspect) / 2, 0]}>
      {/* Soft additive halo behind the cutout */}
      <mesh ref={glow} position={[0, 0, -0.02]}>
        <planeGeometry args={[width * 1.15, width * aspect * 1.1]} />
        <meshBasicMaterial
          ref={glowMat}
          color={PALETTE.gold}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[width, width * aspect]} />
        <meshBasicMaterial ref={mat} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Original stylized hooded silhouette — the always-available fallback. */
function ProceduralFigure() {
  const bodyPivot = useRef<THREE.Group>(null);
  const armPivot = useRef<THREE.Group>(null);
  const lanternLight = useRef<THREE.PointLight>(null);

  const robeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: '#2b3a44', roughness: 0.72, metalness: 0.05, transparent: true }),
    [],
  );
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.emeraldSoft,
        emissive: new THREE.Color(PALETTE.emerald),
        emissiveIntensity: 0.25,
        roughness: 0.6,
        transparent: true,
      }),
    [],
  );
  const lanternMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETTE.goldSoft, transparent: true, toneMapped: false }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { appear, focus } = stage.character;

    if (bodyPivot.current) {
      // A slow idle breathing sway, settling + leaning in as she focuses.
      bodyPivot.current.rotation.z = Math.sin(t * 0.8) * 0.015;
      bodyPivot.current.rotation.x = focus * 0.18;
    }
    if (armPivot.current) {
      armPivot.current.rotation.z = THREE.MathUtils.lerp(-0.3, -1.05, focus) + Math.sin(t * 1.1) * 0.02;
    }

    const op = THREE.MathUtils.clamp(appear, 0, 1);
    robeMat.opacity = op;
    trimMat.opacity = op;
    lanternMat.opacity = op;
    trimMat.emissiveIntensity = 0.18 + focus * 0.5;
    if (lanternLight.current) lanternLight.current.intensity = op * (2 + focus * 3);
  });

  return (
    <group ref={bodyPivot}>
      {/* Robe */}
      <mesh material={robeMat} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.16, 0.5, 1.25, 16]} />
      </mesh>
      {/* Hem trim — the "small glowing storytelling symbol" reads as a glowing hem/trim line */}
      <mesh material={trimMat} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 16]} />
      </mesh>
      {/* Head */}
      <mesh material={robeMat} position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.17, 16, 16]} />
      </mesh>
      {/* Hood */}
      <mesh material={robeMat} position={[0, 1.36, -0.02]} rotation={[0.25, 0, 0]}>
        <coneGeometry args={[0.27, 0.42, 16, 1, true]} />
      </mesh>
      {/* Lantern arm + lantern */}
      <group ref={armPivot} position={[0.16, 0.95, 0.12]}>
        <mesh material={robeMat} position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        </mesh>
        <group position={[0.4, -0.12, 0]}>
          <mesh material={lanternMat}>
            <sphereGeometry args={[0.11, 12, 12]} />
          </mesh>
          <pointLight ref={lanternLight} color={PALETTE.goldSoft} distance={6} decay={2} intensity={0} />
        </group>
      </group>
    </group>
  );
}
