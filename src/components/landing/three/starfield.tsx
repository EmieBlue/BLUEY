import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PALETTE } from '@/components/landing/introConfig';
import { stage } from '@/components/landing/stage';
import { getParticleSprite } from '@/components/landing/three/sprites';

/**
 * The deep-space backdrop: a large sphere of faint stars that slowly rotates, and
 * a nearer cloud of golden dust motes that drift and parallax. Both are single
 * `THREE.Points` draws — cheap enough for any device. `count` is scaled by tier
 * upstream.
 */
function makePositions(count: number, radius: number, flatten = 1) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * (0.55 + Math.random() * 0.45);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.cos(phi) * flatten;
    arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return arr;
}

export function Starfield({ count = 1800 }: { count?: number }) {
  const stars = useRef<THREE.Points>(null);
  const dust = useRef<THREE.Points>(null);

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(makePositions(count, 60), 3));
    return g;
  }, [count]);

  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(makePositions(Math.round(count * 0.25), 14, 0.5), 3),
    );
    return g;
  }, [count]);

  const sprite = useMemo(getParticleSprite, []);

  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(PALETTE.text),
        map: sprite,
        size: 0.14,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [sprite],
  );

  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(PALETTE.gold),
        map: sprite,
        size: 0.09,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [sprite],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    // Fade both layers in over the first beat of the timeline, then hold.
    const fade = THREE.MathUtils.clamp(stage.t * 7, 0, 1);
    starMat.opacity += (fade * 0.9 - starMat.opacity) * 0.05;
    dustMat.opacity += (fade * 0.7 - dustMat.opacity) * 0.05;

    if (stars.current) stars.current.rotation.y += dt * 0.01;
    if (dust.current) {
      dust.current.rotation.y -= dt * 0.03;
      dust.current.rotation.x = Math.sin(stage.t * Math.PI * 2) * 0.05;
    }
    // Streak the dust outward while pushing into the page.
    const stretch = 1 + stage.pageEnter * 5;
    if (dust.current) dust.current.scale.z = stretch;
  });

  return (
    <group>
      <points ref={stars} geometry={starGeo} material={starMat} frustumCulled={false} />
      <points ref={dust} geometry={dustGeo} material={dustMat} frustumCulled={false} />
    </group>
  );
}
