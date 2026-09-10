/**
 * The live, mutable state of the cinematic — a single module-level object that the
 * GSAP timeline WRITES to and the Three.js components READ from inside their
 * `useFrame` loops. Keeping it outside React means the 40-second sequence runs at
 * 60fps without triggering a single re-render; React state is only used for the
 * coarse `phase` (which mounts/unmounts heavy scene groups).
 *
 * Mirrors the pattern already used by `src/lib/pointer.ts`.
 */
export type IntroPhase =
  | 'loading'
  | 'universe'
  | 'book'
  | 'character'
  | 'approach'
  | 'reach'
  | 'opening'
  | 'travel'
  | 'worlds'
  | 'reveal'
  | 'heroText'
  | 'interactive';

/** Ordered — used to compare "are we past phase X yet". */
export const PHASE_ORDER: IntroPhase[] = [
  'loading',
  'universe',
  'book',
  'character',
  'approach',
  'reach',
  'opening',
  'travel',
  'worlds',
  'reveal',
  'heroText',
  'interactive',
];

export type StageState = {
  /** 0..1 progress of the whole timeline. */
  t: number;
  phase: IntroPhase;
  /** True once the timeline has reached its end (naturally or via skip). */
  done: boolean;
  /** The viewer pressed "Skip Intro" — components can hard-cut instead of easing. */
  skipped: boolean;

  /** Per-element 0..1 drivers the timeline eases; components map them to transforms. */
  book: { appear: number; glow: number; open: number; scale: number };
  character: { appear: number; walk: number; reach: number };
  burst: number;
  travel: number;
  worldIndex: number; // 0..(N) float — which world fragment is centred
  universe: number; // ambient field opacity / assembly
  vignette: number;

  /** Camera keyframe the rig lerps toward (world units). */
  cam: {
    px: number;
    py: number;
    pz: number;
    tx: number;
    ty: number;
    tz: number;
    fov: number;
  };
};

export const stage: StageState = {
  t: 0,
  phase: 'loading',
  done: false,
  skipped: false,
  book: { appear: 0, glow: 0, open: 0, scale: 1 },
  character: { appear: 0, walk: 0, reach: 0 },
  burst: 0,
  travel: 0,
  worldIndex: 0,
  universe: 0,
  vignette: 0,
  cam: { px: 0, py: 1.2, pz: 9, tx: 0, ty: 0.6, tz: 0, fov: 55 },
};

/** Reset to the pre-roll state (used when restarting the sequence in dev). */
export function resetStage(): void {
  stage.t = 0;
  stage.phase = 'loading';
  stage.done = false;
  stage.skipped = false;
  stage.book = { appear: 0, glow: 0, open: 0, scale: 1 };
  stage.character = { appear: 0, walk: 0, reach: 0 };
  stage.burst = 0;
  stage.travel = 0;
  stage.worldIndex = 0;
  stage.universe = 0;
  stage.vignette = 0;
  stage.cam = { px: 0, py: 1.2, pz: 9, tx: 0, ty: 0.6, tz: 0, fov: 55 };
}

export function isPastPhase(current: IntroPhase, target: IntroPhase): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

// Dev inspection hook — read `window.__elyra` in the console to watch the
// cinematic's live state. Harmless in production (a single object reference).
if (typeof window !== 'undefined') {
  (window as unknown as { __elyra?: unknown }).__elyra = { stage };
}
