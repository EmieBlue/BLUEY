import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';

/**
 * The curious traveler — an original hooded figure built from primitives (no
 * copyrighted character, no model file). Reads `stage.character`:
 *   appear 0..1 → fade in
 *   walk   0..1 → glide from off-screen-left to beside the book, with a walk bob
 *   reach  0..1 → lean in and raise the lantern toward the book
 *
 * To use a real rigged model later: load a GLTF + `useAnimations`, play the
 * "walk" clip while `walk` increases and cross-fade to "idle"/"reach"; keep this
 * component's position math for the glide.
 */
const START_X = -6.5;
const END_X = -1.85;
const GROUND_Y = -0.82;

export function StoryCharacter() {
  const root = useRef<THREE.Group>(null);
  const bodyPivot = useRef<THREE.Group>(null);
  const armPivot = useRef<THREE.Group>(null);
  const lanternLight = useRef<THREE.PointLight>(null);

  const robeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b3a44', roughness: 0.72, metalness: 0.05, transparent: true }),
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
    () =>
      new THREE.MeshBasicMaterial({ color: PALETTE.goldSoft, transparent: true, toneMapped: false }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const { appear, walk, reach } = stage.character;

    if (root.current) {
      root.current.visible = appear > 0.001;
      root.current.position.x = THREE.MathUtils.lerp(START_X, END_X, easeOutCubic(walk));
      root.current.position.y = GROUND_Y;
      root.current.position.z = 0.5;
      // Face the direction of travel (toward the book on the right).
      root.current.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.5, Math.PI * 0.42, reach);
    }

    const moving = walk > 0.001 && walk < 0.999 ? 1 : 0;
    if (bodyPivot.current) {
      // Walk bob + sway while moving; settle + lean on reach.
      bodyPivot.current.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
      bodyPivot.current.rotation.z = Math.sin(t * 7) * 0.04 * moving;
      bodyPivot.current.rotation.x = reach * 0.22;
    }
    if (armPivot.current) {
      armPivot.current.rotation.z = THREE.MathUtils.lerp(-0.3, -1.15, reach) + Math.sin(t * 7) * 0.15 * moving;
    }

    const op = THREE.MathUtils.clamp(appear, 0, 1);
    robeMat.opacity = op;
    trimMat.opacity = op;
    lanternMat.opacity = op;
    trimMat.emissiveIntensity = 0.18 + reach * 0.5;
    if (lanternLight.current) lanternLight.current.intensity = op * (2.2 + reach * 3.5);
  });

  return (
    <group ref={root} rotation={[0, Math.PI / 2, 0]}>
      <group ref={bodyPivot}>
        {/* Robe */}
        <mesh material={robeMat} position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.16, 0.5, 1.25, 16]} />
        </mesh>
        {/* Hem trim */}
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
            <pointLight
              ref={lanternLight}
              color={PALETTE.goldSoft}
              distance={6}
              decay={2}
              intensity={0}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
