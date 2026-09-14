import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BOOK_POS, CHARACTER_POS, PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';

/**
 * The story explorer — an articulated procedural figure, NOT a photo on a plane
 * and not a single cone. Head, torso, two arms (shoulder + elbow joints), two
 * legs (hip + knee joints) under a long flowing coat, all as separate pivot
 * groups so Scene 4's walk cycle and Scene 5's reach are animation changes
 * rather than a rebuild.
 *
 * Reads `stage.character`:
 *   appear 0..1 → fade in
 *   focus  0..1 → she stops idly looking around and turns to face the book
 *
 * The reference image (`character.png`) informs the palette and silhouette —
 * navy coat with gold trim, cream shirt, boots, long dark hair — but is
 * deliberately NOT texture-mapped onto anything: a picture on a rectangle reads
 * as a picture, which is exactly what this replaces. Structured so a real rigged
 * GLB can replace <Figure/> later without touching the positioning/staging here.
 */
// Lifted from the reference image but a few stops brighter — the environment is
// deliberately near-black, so true-to-photo values render as an unreadable blob.
const SKIN = '#f0c49e';
const HAIR = '#4d3020';
const COAT = '#33456e';
const COAT_DARK = '#222e4c';
const TROUSER = '#4a4033';
const SHIRT = '#f4efe4';
const LEATHER = '#6b4d33';

/** Which way she has to turn to be looking at the book. */
const FACE_CAMERA_Y = 0.1;
const FACE_BOOK_Y = Math.atan2(BOOK_POS[0] - CHARACTER_POS[0], BOOK_POS[2] - CHARACTER_POS[2]);

export function StoryCharacter() {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const rim = useRef<THREE.PointLight>(null);
  const key = useRef<THREE.PointLight>(null);

  const mats = useMemo(() => {
    const make = (color: string, roughness = 0.75, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: true });
    return {
      skin: make(SKIN, 0.62),
      hair: make(HAIR, 0.55),
      coat: make(COAT, 0.7),
      coatDark: make(COAT_DARK, 0.75),
      trouser: make(TROUSER, 0.8),
      shirt: make(SHIRT, 0.8),
      leather: make(LEATHER, 0.65),
      gold: new THREE.MeshStandardMaterial({
        color: PALETTE.gold,
        roughness: 0.3,
        metalness: 0.8,
        emissive: new THREE.Color(PALETTE.gold),
        emissiveIntensity: 0.15,
        transparent: true,
      }),
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { appear, focus } = stage.character;
    const op = THREE.MathUtils.clamp(appear, 0, 1);

    Object.values(mats).forEach((m) => {
      m.opacity = op;
    });
    // Backlit on purpose: she plays as a rim-lit silhouette (the way the
    // reference art frames her), so the front light is only a whisper of fill.
    if (rim.current) rim.current.intensity = op * 7;
    if (key.current) key.current.intensity = op * 0.55;

    if (root.current) {
      root.current.visible = op > 0.001;
      // She turns from facing the camera to facing the book as she notices it.
      root.current.rotation.y = THREE.MathUtils.lerp(FACE_CAMERA_Y, FACE_BOOK_Y, focus);
    }
    if (hips.current) {
      // Breathing + a slow weight shift so she reads as a standing person.
      hips.current.position.y = Math.sin(t * 0.9) * 0.012;
      hips.current.rotation.z = Math.sin(t * 0.45) * 0.02;
    }
    if (chest.current) {
      chest.current.rotation.y = Math.sin(t * 0.38) * 0.06 * (1 - focus);
      chest.current.rotation.x = Math.sin(t * 0.9) * 0.015;
    }
    if (head.current) {
      // Looking around, curious — settles as she locks onto the book.
      head.current.rotation.y = Math.sin(t * 0.5) * 0.45 * (1 - focus) + focus * 0.1;
      head.current.rotation.x = Math.sin(t * 0.33) * 0.08 * (1 - focus) - focus * 0.05;
    }
    // Arms hang with a slight, uneven sway — never perfectly symmetrical.
    if (armL.current) armL.current.rotation.x = Math.sin(t * 0.7) * 0.035 - 0.05;
    if (armR.current) armR.current.rotation.x = Math.sin(t * 0.7 + 1.1) * 0.03 + 0.03;
    if (elbowL.current) elbowL.current.rotation.x = -0.18 + Math.sin(t * 0.7) * 0.02;
    if (elbowR.current) elbowR.current.rotation.x = -0.22 + Math.sin(t * 0.7 + 1.1) * 0.02;
    // Legs stay planted this pass — the joints exist for Scene 4's walk cycle.
    if (legL.current) legL.current.rotation.x = 0.02;
    if (legR.current) legR.current.rotation.x = -0.02;
  });

  return (
    <group ref={root} position={CHARACTER_POS}>
      {/* Two-light setup travelling with her: a cool rim behind for silhouette
          separation from the near-black environment, and a soft warm key in front
          so her face, coat and hands actually read. */}
      {/* Rim light sits on the book's side of her, so it edges her silhouette
          from the same direction the book's glow comes from. */}
      <pointLight
        ref={rim}
        position={[1.6, 1.9, -1.1]}
        color={PALETTE.goldSoft}
        distance={8}
        decay={2}
        intensity={0}
      />
      <pointLight
        ref={key}
        position={[0.9, 1.35, 1.5]}
        color={PALETTE.parchment}
        distance={6}
        decay={2}
        intensity={0}
      />

      <group ref={hips} position={[0, 0.95, 0]}>
        {/* ── Legs — trousers into tall boots, clearly visible below the coat hem ── */}
        {[
          { ref: legL, x: -0.085 },
          { ref: legR, x: 0.085 },
        ].map(({ ref, x }, i) => (
          <group key={i} ref={ref} position={[x, 0, 0]}>
            <mesh material={mats.trouser} position={[0, -0.22, 0]}>
              <capsuleGeometry args={[0.072, 0.3, 4, 10]} />
            </mesh>
            <group position={[0, -0.44, 0]}>
              <mesh material={mats.trouser} position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.062, 0.18, 4, 10]} />
              </mesh>
              {/* Tall boot */}
              <mesh material={mats.leather} position={[0, -0.34, 0]}>
                <capsuleGeometry args={[0.078, 0.22, 4, 12]} />
              </mesh>
              <mesh material={mats.gold} position={[0, -0.235, 0]}>
                <cylinderGeometry args={[0.084, 0.084, 0.02, 12]} />
              </mesh>
              {/* Foot */}
              <mesh material={mats.leather} position={[0, -0.475, 0.045]}>
                <boxGeometry args={[0.145, 0.075, 0.23]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* ── Torso ── */}
        <group ref={chest}>
          <mesh material={mats.shirt} position={[0, 0.24, 0]}>
            <capsuleGeometry args={[0.145, 0.26, 6, 14]} />
          </mesh>
          {/* Belt */}
          <mesh material={mats.leather} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.07, 16]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.02, 0.15]}>
            <boxGeometry args={[0.07, 0.055, 0.03]} />
          </mesh>

          {/* ── Long coat: OPEN at the front (a partial cylinder, gap facing +z)
                 so the shirt, belt and legs stay visible and it reads as a coat
                 rather than a closed cone. Narrow enough that the arms hang
                 outside its silhouette. ── */}
          <mesh material={mats.coat} position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.175, 0.3, 0.95, 24, 1, true, Math.PI * 0.27, Math.PI * 1.46]} />
          </mesh>
          {/* The two front panels of the coat, hanging either side of the opening */}
          {[-1, 1].map((s) => (
            <mesh key={s} material={mats.coatDark} position={[s * 0.15, -0.02, 0.11]} rotation={[0, s * -0.28, 0]}>
              <boxGeometry args={[0.14, 0.95, 0.02]} />
            </mesh>
          ))}
          {/* Gold hem + collar trim */}
          <mesh material={mats.gold} position={[0, -0.49, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.018, 24, 1, true, Math.PI * 0.27, Math.PI * 1.46]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.44, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16, 1, true, Math.PI * 0.27, Math.PI * 1.46]} />
          </mesh>

          {/* ── Arms: shoulder + elbow pivots, outside the coat's silhouette ── */}
          {[
            { ref: armL, elbow: elbowL, x: -0.245, tilt: 0.1 },
            { ref: armR, elbow: elbowR, x: 0.245, tilt: -0.1 },
          ].map(({ ref, elbow, x, tilt }, i) => (
            <group key={i} ref={ref} position={[x, 0.4, 0.05]} rotation={[0, 0, tilt]}>
              <mesh material={mats.coat} position={[0, -0.16, 0]}>
                <capsuleGeometry args={[0.055, 0.26, 4, 10]} />
              </mesh>
              <group ref={elbow} position={[0, -0.32, 0]}>
                <mesh material={mats.coat} position={[0, -0.13, 0]}>
                  <capsuleGeometry args={[0.047, 0.2, 4, 10]} />
                </mesh>
                {/* Cuff + hand */}
                <mesh material={mats.gold} position={[0, -0.235, 0]}>
                  <cylinderGeometry args={[0.052, 0.052, 0.025, 12]} />
                </mesh>
                <mesh material={mats.skin} position={[0, -0.295, 0]}>
                  <capsuleGeometry args={[0.042, 0.06, 4, 8]} />
                </mesh>
              </group>
            </group>
          ))}

          {/* ── Head ── */}
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh material={mats.skin} position={[0, 0.06, 0]}>
              <capsuleGeometry args={[0.088, 0.05, 6, 14]} />
            </mesh>
            {/* Neck */}
            <mesh material={mats.skin} position={[0, -0.07, 0]}>
              <cylinderGeometry args={[0.042, 0.05, 0.08, 10]} />
            </mesh>
            {/* Hair: crown + long hair falling behind the shoulders */}
            <mesh material={mats.hair} position={[0, 0.1, -0.012]}>
              <sphereGeometry args={[0.097, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            </mesh>
            <mesh material={mats.hair} position={[0, -0.12, -0.075]} rotation={[0.16, 0, 0]}>
              <capsuleGeometry args={[0.082, 0.26, 4, 12]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
