/**
 * The live, mutable state of the cinematic — a single module-level object that the
 * timeline WRITES to and the Three.js components READ from inside their `useFrame`
 * loops. Keeping it outside React means the sequence runs at 60fps without
 * triggering a single re-render; React state is only used for the coarse `phase`
 * (which mounts/unmounts heavy scene groups).
 *
 * Mirrors the pattern already used by `src/lib/pointer.ts`.
 *
 * Sequence (Scenes 1-3 of the full brief — see src/components/landing/README.md
 * for the complete planned sequence and what's not built yet):
 *   darkness → explorer → bookDiscovered → [temporary hand-off] → universe →
 *   heroText → interactive
 */
export type IntroPhase =
  | 'loading'
  | 'darkness'
  | 'explorer'
  | 'bookDiscovered'
  | 'universe'
  | 'heroText'
  | 'interactive';

/** Ordered — used to compare "are we past phase X yet". */
export const PHASE_ORDER: IntroPhase[] = [
  'loading',
  'darkness',
  'explorer',
  'bookDiscovered',
  'universe',
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

  /** The Scene-1 symbol "sting" — fades in, holds, fades out. */
  symbolSting: number;
  /** Per-element 0..1 drivers the timeline eases; components map them to transforms. */
  book: { appear: number; glow: number; open: number; scale: number };
  /** `appear` fades her in; `focus` 0→1 is her turning to notice/face the book
   *  (she never walks in this pass — that's Scene 4, not built yet). */
  character: { appear: number; focus: number };
  burst: number;
  universe: number; // ambient hero field opacity / assembly
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

const INITIAL_CAM = { px: 0, py: 0.9, pz: 14, tx: 0, ty: 0.7, tz: 0, fov: 45 };

function initial(): StageState {
  return {
    t: 0,
    phase: 'loading',
    done: false,
    skipped: false,
    symbolSting: 0,
    book: { appear: 0, glow: 0, open: 0, scale: 1 },
    character: { appear: 0, focus: 0 },
    burst: 0,
    universe: 0,
    vignette: 0,
    cam: { ...INITIAL_CAM },
  };
}

export const stage: StageState = initial();

/** Reset to the pre-roll state (used when restarting the sequence in dev). */
export function resetStage(): void {
  Object.assign(stage, initial());
}

export function isPastPhase(current: IntroPhase, target: IntroPhase): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

// Dev inspection hook — read `window.__elyra` in the console to watch the
// cinematic's live state. Harmless in production (a single object reference).
if (typeof window !== 'undefined') {
  (window as unknown as { __elyra?: unknown }).__elyra = { stage };
}
