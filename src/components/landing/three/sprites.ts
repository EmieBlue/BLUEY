import * as THREE from 'three';

/**
 * A soft round sprite for point clouds — without it `THREE.Points` renders hard
 * squares, which reads cheap. Generated once at runtime (no asset) and shared by
 * every particle system on the landing.
 */
let cached: THREE.CanvasTexture | null = null;

export function getParticleSprite(): THREE.CanvasTexture {
  if (cached) return cached;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  cached = new THREE.CanvasTexture(c);
  cached.colorSpace = THREE.SRGBColorSpace;
  return cached;
}
