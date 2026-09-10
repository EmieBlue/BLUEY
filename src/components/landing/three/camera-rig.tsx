import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { stage } from '@/components/landing/stage';

/**
 * The only thing that moves the camera. Every frame it eases the real camera
 * toward `stage.cam` (which the GSAP timeline is animating), then adds a tiny
 * always-on "breathing" drift + pointer parallax so the shot is never dead
 * still. All offsets are small and eased — no lurching (motion-sickness guard).
 */
const tmpTarget = new THREE.Vector3();

export function CameraRig() {
  const { camera, pointer } = useThree();
  const idle = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    idle.current += dt;

    // Breathing: a slow Lissajous wobble, larger once the intro is over.
    const amp = stage.done ? 0.22 : 0.06;
    const bx = Math.sin(idle.current * 0.23) * amp;
    const by = Math.cos(idle.current * 0.19) * amp * 0.6;

    // Pointer parallax (canvas-relative, already -1..1). Eased & clamped.
    const px = pointer.x * (stage.done ? 0.5 : 0.15);
    const py = -pointer.y * (stage.done ? 0.3 : 0.1);

    const k = 1 - Math.pow(0.0016, dt); // frame-rate-independent lerp factor

    camera.position.x += (stage.cam.px + bx + px - camera.position.x) * k;
    camera.position.y += (stage.cam.py + by + py - camera.position.y) * k;
    camera.position.z += (stage.cam.pz - camera.position.z) * k;

    tmpTarget.set(stage.cam.tx, stage.cam.ty, stage.cam.tz);
    camera.lookAt(tmpTarget);

    const persp = camera as THREE.PerspectiveCamera;
    if (Math.abs(persp.fov - stage.cam.fov) > 0.01) {
      persp.fov += (stage.cam.fov - persp.fov) * k;
      persp.updateProjectionMatrix();
    }
  });

  return null;
}
