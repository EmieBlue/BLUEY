import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { BOOK_POS, CHARACTER_POS, GROUND_Y, PALETTE } from '@/components/landing/introConfig';
import { isPastPhase, stage, type IntroPhase } from '@/components/landing/stage';
import { CameraRig } from '@/components/landing/three/camera-rig';
import { MagicParticles } from '@/components/landing/three/magic-particles';
import { Starfield } from '@/components/landing/three/starfield';
import { StoryBook3D } from '@/components/landing/three/story-book-3d';
import { StoryCharacter } from '@/components/landing/three/story-character';
import { StoryUniverse } from '@/components/landing/three/story-universe';
import type { TierProfile } from '@/lib/device-tier';

/**
 * The single WebGL canvas. Scenes 1-3 of the brief: darkness → the story
 * explorer → discovering the book, then a temporary hand-off into the existing
 * hero universe. Groups mount/unmount with `phase` so nothing expensive renders
 * before its moment.
 */
type Props = {
  phase: IntroPhase;
  profile: TierProfile;
  onReady: () => void;
};

export default function StoryScene({ phase, profile, onReady }: Props) {
  const [dpr, setDpr] = useState(profile.maxDpr);

  // Stable across the many phase re-renders so the composer isn't rebuilt.
  const effects = useMemo(() => {
    if (profile.postFx === 'none') return null;
    return [
      <Bloom
        key="bloom"
        mipmapBlur
        // Threshold kept high: at a lower one the whole book blooms into a white
        // slab instead of just the gold trim and the emblem catching light.
        intensity={profile.postFx === 'full' ? 0.6 : 0.45}
        luminanceThreshold={0.45}
        luminanceSmoothing={0.85}
      />,
      profile.postFx === 'full' ? (
        // Subtle only. `focusDistance` is normalised over the camera's near..far
        // range, so a small value here focuses ~2-3 units out and smears
        // everything past it — which previously erased the Scene-1 symbol entirely.
        <DepthOfField key="dof" focusDistance={0.03} focalLength={0.1} bokehScale={1.2} />
      ) : null,
      <Vignette key="vig" eskil={false} offset={0.2} darkness={1.05} />,
    ].filter(Boolean) as React.ReactElement[];
  }, [profile.postFx]);

  const showCharacter = isPastPhase(phase, 'explorer');
  // Faint from the moment she's revealed (a glow at the frame's edge), full in Scene 3.
  const showBook = isPastPhase(phase, 'explorer') && !isPastPhase(phase, 'heroText');
  const showUniverse = isPastPhase(phase, 'universe');

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: profile.tier !== 'low', powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0, 0.9, 14], fov: 45, near: 0.1, far: 220 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(PALETTE.space0), 1);
        onReady();
      }}>
      <fog attach="fog" args={[PALETTE.space0, 8, 42]} />

      {/* Deliberately dark — she's lit by her own rim light and the book's glow. */}
      <ambientLight intensity={0.12} color={PALETTE.space2} />
      <hemisphereLight intensity={0.16} color={PALETTE.emeraldSoft} groundColor={PALETTE.space0} />
      <directionalLight position={[-3, 6, 4]} intensity={0.4} color={PALETTE.parchment} />

      <CameraRig />
      <Starfield count={profile.tier === 'high' ? 2200 : profile.tier === 'mid' ? 1300 : 700} />
      <Ground />


      {showCharacter && <StoryCharacter />}
      {showBook && (
        <>
          <StoryBook3D />
          <BookAura />
        </>
      )}
      {showUniverse && (
        <StoryUniverse
          count={profile.storyObjects}
          particleCount={profile.universeParticles}
          enabled={phase === 'interactive'}
          pointerFine={profile.pointerFine}
        />
      )}

      {effects && <EffectComposer enableNormalPass={false}>{effects}</EffectComposer>}

      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
        onIncline={() => setDpr(profile.maxDpr)}
      />
    </Canvas>
  );
}

/**
 * Ground she actually stands on — a disc that fades to nothing at its edge so it
 * reads as "a floor somewhere in the dark" rather than a hard-edged slab in a
 * void, plus a soft contact shadow under her feet so she isn't hovering.
 */
function Ground() {
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);

  const fade = useMemo(() => {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }, []);

  const shadow = useMemo(() => {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(() => {
    // Comes up with the rest of the scene, then dims once we're out in the universe.
    if (groundMat.current) {
      const target = THREE.MathUtils.clamp(stage.t * 5, 0, 1) * (1 - stage.universe * 0.85);
      groundMat.current.opacity += (target - groundMat.current.opacity) * 0.06;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial
          ref={groundMat}
          color={PALETTE.space1}
          alphaMap={fade}
          transparent
          opacity={0}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      {/* Contact shadows so the figure and the book are anchored to the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CHARACTER_POS[0], GROUND_Y + 0.005, CHARACTER_POS[2]]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[BOOK_POS[0], GROUND_Y + 0.005, BOOK_POS[2]]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Motes orbiting the book — its magic, present before it ever opens. */
function BookAura() {
  return (
    <MagicParticles
      behavior="orbit"
      count={110}
      radius={0.85}
      size={0.035}
      color={PALETTE.gold}
      intensity={() => stage.book.appear * (0.35 + stage.book.glow)}
      position={BOOK_POS}
    />
  );
}
