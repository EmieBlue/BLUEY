import { Edges, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { PALETTE, type StoryObjectSpec } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { StorySymbol } from '@/components/landing/three/symbol';

/**
 * A single floating story artefact in the hero universe — book / comic panel /
 * story card / video screen / portal. Drifts on its own; on hover (or tap on
 * touch devices) it eases toward the viewer, brightens, scales up a touch and
 * shows its title. Interactions are inert until the intro hands over
 * (`enabled`).
 */
type Props = {
  spec: StoryObjectSpec;
  position: [number, number, number];
  scale?: number;
  enabled: boolean;
  pointerFine: boolean;
};

export function StoryObject({ spec, position, scale = 1, enabled, pointerFine }: Props) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const [active, setActive] = useState(false);
  const seed = useMemo(() => Math.random() * 10, []);
  const home = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime + seed;
    if (!group.current) return;

    // Assemble in on `stage.universe`, then hold.
    const assemble = THREE.MathUtils.clamp(stage.universe * 1.2 - 0.1, 0, 1);
    group.current.scale.setScalar(scale * assemble * (active ? 1.16 : 1));

    // Idle drift around the home point.
    const driftX = Math.sin(t * 0.4) * 0.18;
    const driftY = Math.cos(t * 0.33) * 0.16;
    const pull = active ? 1.1 : 0; // toward camera when active
    group.current.position.set(home.x + driftX, home.y + driftY, home.z + pull);
    group.current.rotation.y += dt * (active ? 0.9 : 0.2);
    group.current.rotation.x = Math.sin(t * 0.3) * 0.15;

    if (mat.current) {
      const target = active ? 0.85 : 0.06;
      mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.12;
    }
  });

  const bind = enabled
    ? pointerFine
      ? {
          onPointerOver: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            setActive(true);
            document.body.style.cursor = 'pointer';
          },
          onPointerOut: () => {
            setActive(false);
            document.body.style.cursor = '';
          },
        }
      : {
          onClick: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            setActive((v) => !v);
          },
        }
    : {};

  const isPortal = spec.kind === 'portal';

  return (
    <group ref={group} position={position} {...bind}>
      <mesh>
        <Geometry kind={spec.kind} />
        <meshStandardMaterial
          ref={mat}
          color={isPortal ? PALETTE.emerald : PALETTE.space1}
          emissive={new THREE.Color(spec.kind === 'screen' ? PALETTE.emeraldSoft : PALETTE.gold)}
          emissiveIntensity={0.06}
          roughness={0.45}
          metalness={0.35}
        />
        {!isPortal && (
          <Edges scale={1.001} threshold={15} color={PALETTE.gold} />
        )}
      </mesh>
      {/* The recurring symbol, centred in the portal ring */}
      {isPortal && <StorySymbol size={0.45} billboard />}

      {active && (
        <Html center distanceFactor={9} position={[0, 0.95, 0]} pointerEvents="none">
          <div
            style={{
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: PALETTE.text,
              textShadow: '0 2px 18px rgba(0,0,0,0.85)',
            }}>
            <div style={{ fontSize: 15, letterSpacing: 2, fontWeight: 700 }}>{spec.title}</div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: PALETTE.gold, marginTop: 3 }}>
              {spec.meta.toUpperCase()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Geometry({ kind }: { kind: StoryObjectSpec['kind'] }) {
  switch (kind) {
    case 'comic':
      return <boxGeometry args={[1.1, 1.5, 0.06]} />;
    case 'card':
      return <boxGeometry args={[1.0, 1.4, 0.05]} />;
    case 'screen':
      return <boxGeometry args={[1.6, 0.95, 0.06]} />;
    case 'portal':
      return <torusGeometry args={[0.6, 0.12, 16, 40]} />;
    case 'book':
    default:
      return <boxGeometry args={[0.9, 1.25, 0.28]} />;
  }
}
