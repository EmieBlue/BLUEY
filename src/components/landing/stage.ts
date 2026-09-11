/**
 * The live, mutable state of the cinematic — a single module-level object that the
 * timeline WRITES to and the Three.js components READ from inside their `useFrame`
 * loops. Keeping it outside React means the sequence runs at 60fps without
 * triggering a single re-render; React state is only used for the coarse `phase`
 * (which mounts/unmounts heavy scene groups).
 *
 * Mirrors the pattern already used by `src/lib/pointer.ts`.
 *
 * Sequence (v2 — reference-art restructure):
 *   establish → book → opening → lightEscape → pageEnter → worldMorph → pullOut →
 *   universe → heroText → interactive
 */
export type IntroPhase =
  | 'loading'
  | 'establish'
  | 'book'
  | 'opening'
  | 'lightEscape'
  | 'pageEnter'
  | 'worldMorph'
  | 'pullOut'
  | 'universe'
  | 'heroText'
  | 'interactive';

/** Ordered — used to compare "are we past phase X yet". */
export const PHASE_ORDER: IntroPhase[] = [
  'loading',
  'establish',
  'book',
  'opening',
  'lightEscape',
  'pageEnter',
  'worldMorph',
  'pullOut',
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

  /** Per-element 0..1 drivers the timeline eases; components map them to transforms. */
  book: { appear: number; glow: number; open: number; scale: number };
  /** `appear` fades the character in; `focus` 0→1 is her "noticing/turning to" beat
   *  in `establish` and stays 1 through `universe` — she never walks, only turns/settles. */
  character: { appear: number; focus: number };
  burst: number;
  pageEnter: number; // 0..1 push into the page/portal
  worldIndex: number; // 0..4 float — which of the 4 morph worlds is centred
  pullOut: number; // 0..1 camera/FOV pull-back for the universe reveal
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

const INITIAL_CAM = { px: 0, py: 1.2, pz: 9, tx: 0, ty: 0.6, tz: 0, fov: 55 };

function initial(): StageState {
  return {
    t: 0,
    phase: 'loading',
    done: false,
    skipped: false,
    book: { appear: 0, glow: 0, open: 0, scale: 1 },
    character: { appear: 0, focus: 0 },
    burst: 0,
    pageEnter: 0,
    worldIndex: 0,
    pullOut: 0,
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
