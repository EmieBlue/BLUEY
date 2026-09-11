import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useMemo, useState } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { isPastPhase, stage, type IntroPhase } from '@/components/landing/stage';
import { CameraRig } from '@/components/landing/three/camera-rig';
import { MagicParticles } from '@/components/landing/three/magic-particles';
import { Starfield } from '@/components/landing/three/starfield';
import { StoryBook3D } from '@/components/landing/three/story-book-3d';
import { StoryCharacter } from '@/components/landing/three/story-character';
import { StoryPortal } from '@/components/landing/three/story-portal';
import { StoryUniverse } from '@/components/landing/three/story-universe';
import { WorldFragments } from '@/components/landing/three/world-fragment';
import type { TierProfile } from '@/lib/device-tier';

/**
 * The single WebGL canvas. Assembles lighting + post-processing once and
 * mounts/unmounts the heavy scene groups as `phase` advances so nothing
 * expensive renders before (or long after) its moment. Pure procedural geometry
 * — no assets — so "ready" is really just "this module finished loading".
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
        intensity={profile.postFx === 'full' ? 0.9 : 0.6}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
      />,
      profile.postFx === 'full' ? (
        <DepthOfField key="dof" focusDistance={0} focalLength={0.028} bokehScale={2.4} />
      ) : null,
      <Vignette key="vig" eskil={false} offset={0.22} darkness={0.9} />,
    ].filter(Boolean) as React.ReactElement[];
  }, [profile.postFx]);

  const showBook = isPastPhase(phase, 'establish') && !isPastPhase(phase, 'heroText');
  // She bookends the sequence: present while establishing + approaching the book,
  // fades out once it opens, reappears as the camera pulls out to the universe.
  const showCharacter = phase === 'establish' || phase === 'book' || isPastPhase(phase, 'pullOut');
  const showBurst = isPastPhase(phase, 'opening') && !isPastPhase(phase, 'pageEnter');
  const showPortal = isPastPhase(phase, 'opening');
  const showWorlds =
    profile.worldFragments > 0 && isPastPhase(phase, 'pageEnter') && !isPastPhase(phase, 'pullOut');
  const showUniverse = isPastPhase(phase, 'worldMorph');

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: profile.tier !== 'low', powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0, 1.6, 12], fov: 58, near: 0.1, far: 220 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(PALETTE.space0), 1);
        onReady();
      }}>
      <fog attach="fog" args={[PALETTE.space0, 16, 95]} />

      <ambientLight intensity={0.35} color={PALETTE.space2} />
      <hemisphereLight intensity={0.25} color={PALETTE.emeraldSoft} groundColor={PALETTE.space0} />
      <directionalLight position={[4, 8, 6]} intensity={0.7} color={PALETTE.parchment} />
      <pointLight position={[0, 1.2, 3]} intensity={0.6} color={PALETTE.gold} distance={14} decay={2} />

      <CameraRig />
      <Starfield count={profile.tier === 'high' ? 2200 : profile.tier === 'mid' ? 1300 : 700} />

      {showBook && (
        <group>
          <StoryBook3D />
          <BookAura />
        </group>
      )}
      {showCharacter && <StoryCharacter />}
      {showBurst && (
        <>
          <RiseDriver />
          <BurstDriver />
        </>
      )}
      {showPortal && <StoryPortal />}
      {showWorlds && <WorldFragments limit={profile.worldFragments} />}
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

/* Small wrappers that bind live `stage` drivers to a MagicParticles instance. */
function BookAura() {
  return (
    <MagicParticles
      behavior="orbit"
      count={140}
      radius={1.9}
      color={PALETTE.gold}
      intensity={() => stage.book.appear * (0.4 + stage.book.glow)}
      position={[0, 0.72, 0]}
    />
  );
}

function RiseDriver() {
  return (
    <MagicParticles
      behavior="rise"
      count={120}
      radius={1.4}
      size={0.08}
      color={PALETTE.parchment}
      intensity={() => stage.book.open}
      position={[0, 0.8, 0.1]}
    />
  );
}

function BurstDriver() {
  return (
    <MagicParticles
      behavior="burst"
      count={260}
      radius={1.1}
      size={0.07}
      color={PALETTE.goldSoft}
      intensity={() => stage.burst}
      position={[0, 0.8, 0.1]}
    />
  );
}
