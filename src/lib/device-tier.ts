/**
 * Rough capability probe for the cinematic landing. Web-only in practice (the 3D
 * experience never mounts on native), but safe to call anywhere.
 *
 *  - `low`  → weak GPU / small screen / few cores, OR the viewer asked for less
 *             motion. The cinematic is skipped entirely and `CalmLanding` shows.
 *  - `mid`  → capable phone / modest laptop. A trimmed, cheaper cinematic.
 *  - `high` → desktop-class GPU. The full sequence with depth-of-field + heavy
 *             particle fields.
 *
 * Everything is a heuristic — tune the thresholds in one place here.
 */
export type DeviceTier = 'low' | 'mid' | 'high';

export type TierProfile = {
  tier: DeviceTier;
  /** The viewer set `prefers-reduced-motion: reduce`. Always skip the cinematic. */
  reducedMotion: boolean;
  /** Upper bound for the R3F canvas devicePixelRatio. */
  maxDpr: number;
  /** Depth-of-field + heavy bloom are only worth it on `high`. */
  postFx: 'full' | 'bloom' | 'none';
  /** Particle budget for the story-universe ambient field. */
  universeParticles: number;
  /** How many of the 4 world-morph stages (castle/forest/comic/video) to render. */
  worldFragments: number;
  /** Interactive floating story objects in the hero. */
  storyObjects: number;
  /** Use the shorter timeline (drops the standalone light/pull-out beats). */
  shortSequence: boolean;
  /** Hover isn't a thing on touch devices — fall back to tap. */
  pointerFine: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Cheap WebGL renderer-string sniff for obviously-weak / software GPUs. */
function gpuLooksWeak(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    const r = renderer.toLowerCase();
    // SwiftShader / llvmpipe / ANGLE software fallbacks, plus very old mobile GPUs.
    return /swiftshader|llvmpipe|software|microsoft basic|mali-4|adreno 3\d\d\b|powervr sgx/.test(r);
  } catch {
    return false;
  }
}

/** `?tier=high|mid|low` in the URL forces a tier — handy for previewing the
 *  mobile experience on a desktop (and vice-versa). */
function tierOverride(): DeviceTier | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const v = new URLSearchParams(window.location.search).get('tier');
    return v === 'high' || v === 'mid' || v === 'low' ? v : null;
  } catch {
    return null;
  }
}

let cached: TierProfile | null = null;

export function getTierProfile(): TierProfile {
  if (cached) return cached;

  const reducedMotion = prefersReducedMotion();
  const forced = tierOverride();
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const cores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;
  // `deviceMemory` is Chromium-only; treat missing as "unknown, assume ok".
  const memory =
    typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
      : 8;
  const pointerFine =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : true;

  let tier: DeviceTier;
  if (forced) {
    tier = forced;
  } else if (reducedMotion || gpuLooksWeak() || cores <= 2 || memory <= 2) {
    tier = 'low';
  } else if (width < 900 || !pointerFine || cores <= 4 || memory <= 4) {
    tier = 'mid';
  } else {
    tier = 'high';
  }

  cached = {
    tier,
    reducedMotion,
    pointerFine,
    maxDpr: tier === 'high' ? 2 : 1.5,
    postFx: tier === 'high' ? 'full' : tier === 'mid' ? 'bloom' : 'none',
    universeParticles: tier === 'high' ? 4200 : tier === 'mid' ? 1600 : 700,
    worldFragments: tier === 'high' ? 4 : tier === 'mid' ? 3 : 0,
    storyObjects: tier === 'high' ? 22 : tier === 'mid' ? 12 : 6,
    shortSequence: tier !== 'high',
  };
  return cached;
}

/** Test / dev helper — forget the memoised probe so the next call re-measures. */
export function resetTierProfile(): void {
  cached = null;
}
