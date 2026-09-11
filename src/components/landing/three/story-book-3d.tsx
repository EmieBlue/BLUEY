import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { StorySymbol } from '@/components/landing/three/symbol';
import { ASSET_URL, useOptionalTexture } from '@/lib/landing-assets';

/**
 * The mysterious floating storybook. Procedural by default (no asset needed);
 * once `public/landing/book-cover.jpg` exists it's painted onto the front cover
 * and the procedural emblem gives way to the real art (which already carries
 * the symbol). Reads `stage.book` each frame:
 *   appear 0..1  → fade + scale in
 *   glow   0..1  → emissive strength of the gold trim + cover emblem
 *   open   0..1  → front cover swings back, inner pages fan and auto-turn
 *   scale        → extra multiplier (the timeline blows it up on "pageEnter")
 *
 * To swap in a real model later: load a GLTF with `useGLTF(modelUrl)` and render
 * it in place of <BookMesh/>, keeping the same three drivers wired to its
 * cover bone / emissive material.
 */
const LEATHER = '#221a12';
const PAGE = PALETTE.parchment;

export function StoryBook3D() {
  const root = useRef<THREE.Group>(null);
  const coverPivot = useRef<THREE.Group>(null);
  const pagesFan = useRef<THREE.Group>(null);
  const flipPage = useRef<THREE.Mesh>(null);
  const coverArt = useOptionalTexture(ASSET_URL.bookCover);

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
    () =>
      new THREE.MeshStandardMaterial({
        color: LEATHER,
        roughness: 0.82,
        metalness: 0.1,
        transparent: true,
      }),
    [],
  );
  const pageMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PAGE,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const coverArtMat = useMemo(
    () =>
      coverArt
        ? new THREE.MeshStandardMaterial({
            map: coverArt,
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
            emissive: new THREE.Color(PALETTE.gold),
            emissiveIntensity: 0,
          })
        : null,
    [coverArt],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { appear, glow, open, scale } = stage.book;

    if (root.current) {
      const s = THREE.MathUtils.lerp(0.55, 1, appear) * scale;
      root.current.scale.setScalar(s);
      root.current.position.y = 0.72 + Math.sin(t * 0.9) * 0.05;
      root.current.rotation.y = Math.sin(t * 0.28) * 0.18 + open * 0.3;
      root.current.rotation.z = Math.sin(t * 0.4) * 0.02;
      root.current.visible = appear > 0.001;
    }

    // Fade every material together.
    const op = THREE.MathUtils.clamp(appear, 0, 1);
    goldMat.opacity = op;
    leatherMat.opacity = op;
    pageMat.opacity = op;
    goldMat.emissiveIntensity += (glow * 1.6 - goldMat.emissiveIntensity) * 0.08;
    if (coverArtMat) {
      coverArtMat.opacity = op;
      coverArtMat.emissiveIntensity += (glow * 0.5 - coverArtMat.emissiveIntensity) * 0.08;
    }

    if (coverPivot.current) {
      // 0 = shut, 1 = swung ~150° open.
      coverPivot.current.rotation.y = -open * THREE.MathUtils.degToRad(152);
    }
    if (pagesFan.current) {
      pagesFan.current.children.forEach((child, i) => {
        const spread = (i - 1.5) * 0.14 * open;
        child.rotation.y = -open * THREE.MathUtils.degToRad(70) + spread;
      });
      (pagesFan.current as THREE.Group).visible = open > 0.02;
    }
    if (flipPage.current) {
      flipPage.current.visible = open > 0.6;
      // Pages turning by themselves once the book is open.
      flipPage.current.rotation.y = -Math.PI / 2 + Math.sin(t * 1.6) * 1.4;
    }
  });

  return (
    <group ref={root} position={[0, 0.72, 0]}>
      {/* Back cover */}
      <mesh material={leatherMat} position={[0, 0, -0.16]}>
        <boxGeometry args={[2.1, 2.9, 0.12]} />
      </mesh>
      {/* Page block */}
      <mesh material={pageMat} position={[0.02, 0, 0]}>
        <boxGeometry args={[1.94, 2.74, 0.28]} />
      </mesh>
      {/* Spine */}
      <mesh material={leatherMat} position={[-1.02, 0, 0]}>
        <boxGeometry args={[0.16, 2.94, 0.5]} />
      </mesh>

      {/* Fanning inner pages (revealed as the book opens) */}
      <group ref={pagesFan} position={[-1.0, 0, 0.02]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={pageMat} position={[0.97, 0, i * 0.006]}>
            <planeGeometry args={[1.9, 2.66]} />
          </mesh>
        ))}
      </group>
      {/* A single page that keeps turning on its own */}
      <mesh ref={flipPage} material={pageMat} position={[-1.0, 0, 0.05]}>
        <planeGeometry args={[1.9, 2.66]} />
      </mesh>

      {/* Front cover — hinged at the spine so it swings open */}
      <group ref={coverPivot} position={[-1.02, 0, 0.16]}>
        <mesh material={leatherMat} position={[1.02, 0, 0]}>
          <boxGeometry args={[2.1, 2.9, 0.12]} />
        </mesh>
        {/* Gold edge trim */}
        <mesh material={goldMat} position={[1.02, 1.4, 0.07]}>
          <boxGeometry args={[2.0, 0.05, 0.02]} />
        </mesh>
        <mesh material={goldMat} position={[1.02, -1.4, 0.07]}>
          <boxGeometry args={[2.0, 0.05, 0.02]} />
        </mesh>
        <mesh material={goldMat} position={[1.98, 0, 0.07]}>
          <boxGeometry args={[0.05, 2.8, 0.02]} />
        </mesh>

        {coverArtMat ? (
          // Real reference art — already carries the symbol, so no procedural emblem on top.
          <mesh material={coverArtMat} position={[1.02, 0, 0.065]}>
            <planeGeometry args={[1.85, 2.65]} />
          </mesh>
        ) : (
          <group position={[1.02, 0, 0.09]}>
            <StorySymbol size={0.42} />
          </group>
        )}
      </group>
    </group>
  );
}
