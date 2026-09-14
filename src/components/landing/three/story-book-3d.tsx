import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BOOK_POS, PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { StorySymbol } from '@/components/landing/three/symbol';

/**
 * The magical storybook — a real object built from geometry: separate covers with
 * thickness, a page block, a spine, a hinged front cover, and light escaping from
 * between the pages even while it's shut. Sized so a person could plausibly reach
 * out and open it (Scenes 4-6), not a monolith.
 *
 * Deliberately NOT texture-mapped with `book-cover.jpg` — a photo on a flat face
 * reads as a picture of a book rather than a book. The reference image informs
 * the look (dark leather, gold corners, glowing emblem) and the emblem itself is
 * the shared `StorySymbol`.
 *
 * Reads `stage.book`: appear (fade/scale in), glow (emissive + escaping light),
 * open (cover swings, pages fan — Scene 6, not driven yet), scale (multiplier).
 * To swap in a real GLB later, replace the meshes below and keep these drivers.
 */
const LEATHER = '#241a11';
const LEATHER_EDGE = '#3a2a19';
const PAGE = PALETTE.parchment;

// A hefty tome: ~0.95 x 1.3 units, about chest-sized against a 1.7-unit figure.
const W = 0.95;
const H = 1.3;
const COVER_T = 0.055;
const BLOCK_T = 0.13;
const HINGE_X = -W / 2;

export function StoryBook3D() {
  const root = useRef<THREE.Group>(null);
  const coverPivot = useRef<THREE.Group>(null);
  const pagesFan = useRef<THREE.Group>(null);
  const flipPage = useRef<THREE.Mesh>(null);
  const seam = useRef<THREE.Mesh>(null);
  const innerLight = useRef<THREE.PointLight>(null);

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.gold,
        metalness: 0.85,
        roughness: 0.28,
        emissive: new THREE.Color(PALETTE.gold),
        emissiveIntensity: 0,
        transparent: true,
      }),
    [],
  );
  const leatherMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.85, metalness: 0.08, transparent: true }),
    [],
  );
  const edgeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: LEATHER_EDGE, roughness: 0.7, metalness: 0.1, transparent: true }),
    [],
  );
  const pageMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PAGE,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );
  /** The light escaping from between the pages — bright, unlit by the scene. */
  const seamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.goldSoft,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { appear, glow, open, scale } = stage.book;
    const op = THREE.MathUtils.clamp(appear, 0, 1);

    if (root.current) {
      root.current.scale.setScalar(THREE.MathUtils.lerp(0.82, 1, op) * scale);
      root.current.position.y = BOOK_POS[1] + Math.sin(t * 0.8) * 0.035;
      // Resting angle turns the emblem face toward where the camera settles in
      // Scene 3, so the cover reads rather than presenting its edge.
      root.current.rotation.y = -0.8 + Math.sin(t * 0.26) * 0.12 + open * 0.3;
      root.current.rotation.z = Math.sin(t * 0.37) * 0.025;
      root.current.rotation.x = -0.06 + Math.sin(t * 0.31) * 0.015;
      root.current.visible = op > 0.001;
    }

    goldMat.opacity = op;
    leatherMat.opacity = op;
    edgeMat.opacity = op;
    pageMat.opacity = op;
    goldMat.emissiveIntensity += (glow * 1.8 - goldMat.emissiveIntensity) * 0.08;

    // Light bleeding out between the pages — pulses gently, brighter with `glow`.
    const seamTarget = op * (0.25 + glow * 0.75) * (0.75 + Math.sin(t * 1.7) * 0.25);
    seamMat.opacity += (seamTarget - seamMat.opacity) * 0.1;
    if (seam.current) seam.current.scale.y = 1 + Math.sin(t * 1.3) * 0.04;
    // Kept deliberately weak and short-range: at the book's own scale a strong
    // point light blows the covers out to white and dumps a glow pool on the floor.
    if (innerLight.current) innerLight.current.intensity = op * (0.15 + glow * 0.5);

    if (coverPivot.current) coverPivot.current.rotation.y = -open * THREE.MathUtils.degToRad(152);
    if (pagesFan.current) {
      pagesFan.current.children.forEach((child, i) => {
        child.rotation.y = -open * THREE.MathUtils.degToRad(70) + (i - 1.5) * 0.14 * open;
      });
      pagesFan.current.visible = open > 0.02;
    }
    if (flipPage.current) {
      flipPage.current.visible = open > 0.6;
      flipPage.current.rotation.y = -Math.PI / 2 + Math.sin(t * 1.6) * 1.4;
    }
  });

  return (
    <group ref={root} position={BOOK_POS}>
      {/* Warm light leaking out at the fore-edge, where the page seam glows */}
      <pointLight
        ref={innerLight}
        position={[W / 2 + 0.06, 0, 0]}
        color={PALETTE.goldSoft}
        distance={1.6}
        decay={2}
        intensity={0}
      />

      {/* Back cover */}
      <mesh material={leatherMat} position={[0, 0, -(BLOCK_T / 2 + COVER_T / 2)]}>
        <boxGeometry args={[W, H, COVER_T]} />
      </mesh>
      {/* Page block */}
      <mesh material={pageMat} position={[0.012, 0, 0]}>
        <boxGeometry args={[W - 0.07, H - 0.06, BLOCK_T]} />
      </mesh>
      {/* Glowing seam along the fore-edge — the light escaping from between pages */}
      <mesh ref={seam} material={seamMat} position={[W / 2 - 0.028, 0, 0]}>
        <boxGeometry args={[0.02, H - 0.12, BLOCK_T + 0.03]} />
      </mesh>
      {/* Spine */}
      <mesh material={edgeMat} position={[HINGE_X - 0.012, 0, 0]}>
        <boxGeometry args={[0.072, H + 0.02, BLOCK_T + COVER_T * 2 + 0.012]} />
      </mesh>

      {/* Inner pages, revealed as it opens (Scene 6) */}
      <group ref={pagesFan} position={[HINGE_X, 0, 0.012]} visible={false}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={pageMat} position={[W / 2 - 0.02, 0, i * 0.004]}>
            <planeGeometry args={[W - 0.08, H - 0.08]} />
          </mesh>
        ))}
      </group>
      <mesh ref={flipPage} material={pageMat} position={[HINGE_X, 0, 0.03]} visible={false}>
        <planeGeometry args={[W - 0.08, H - 0.08]} />
      </mesh>

      {/* Front cover — hinged at the spine */}
      <group ref={coverPivot} position={[HINGE_X, 0, BLOCK_T / 2 + COVER_T / 2]}>
        <mesh material={leatherMat} position={[W / 2, 0, 0]}>
          <boxGeometry args={[W, H, COVER_T]} />
        </mesh>
        {/* Gold border inset into the cover */}
        {[
          { p: [W / 2, H / 2 - 0.075, COVER_T / 2] as const, s: [W - 0.13, 0.018, 0.012] as const },
          { p: [W / 2, -(H / 2 - 0.075), COVER_T / 2] as const, s: [W - 0.13, 0.018, 0.012] as const },
          { p: [W - 0.075, 0, COVER_T / 2] as const, s: [0.018, H - 0.13, 0.012] as const },
          { p: [0.075, 0, COVER_T / 2] as const, s: [0.018, H - 0.13, 0.012] as const },
        ].map((b, i) => (
          <mesh key={i} material={goldMat} position={[...b.p]}>
            <boxGeometry args={[...b.s]} />
          </mesh>
        ))}
        {/* Corner caps */}
        {[
          [0.05, H / 2 - 0.05],
          [W - 0.05, H / 2 - 0.05],
          [0.05, -(H / 2 - 0.05)],
          [W - 0.05, -(H / 2 - 0.05)],
        ].map(([x, y], i) => (
          <mesh key={i} material={goldMat} position={[x, y, COVER_T / 2]}>
            <boxGeometry args={[0.085, 0.085, 0.014]} />
          </mesh>
        ))}
        {/* The emblem — the same recurring symbol used across the landing */}
        <group position={[W / 2, 0, COVER_T / 2 + 0.012]}>
          <StorySymbol size={0.2} />
        </group>
      </group>
    </group>
  );
}
