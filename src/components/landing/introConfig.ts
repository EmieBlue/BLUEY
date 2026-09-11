/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONE FILE TO CUSTOMISE THE CINEMATIC LANDING
 * ─────────────────────────────────────────────────────────────────────────────
 * Colours, scene timings, camera moves, particle amounts and — most usefully —
 * the story titles that float in the hero universe and the worlds you fly
 * through. Nothing here touches rendering logic; tweak freely.
 */
import type { IntroPhase } from './stage';

/* ── Palette ──────────────────────────────────────────────────────────────── */
// Pulled from `Colors.emeralddark` in src/constants/theme.ts + the gold accent
// already used by the login beam. Kept as plain hex so Three.js can read them.
export const PALETTE = {
  space0: '#02100C', // deepest background
  space1: '#04140F', // emerald-noir base (matches the app)
  space2: '#0A2A20', // nebula mid
  emerald: '#12A97E', // brand accent
  emeraldSoft: '#3BC79E',
  gold: '#E8C46B', // magic / embossing / glow
  goldSoft: '#F7E29C',
  parchment: '#F4EDE3', // page + letter fragments
  text: '#ECF7F2',
  textDim: 'rgba(236,247,242,0.66)',
};

/* ── Timeline ─────────────────────────────────────────────────────────────── */
// Each phase's DURATION in seconds. The full run is the sum; the trimmed
// (mobile / mid-tier) run only plays the phases listed in SHORT_SEQUENCE.
// Sequence: establish (character) -> book -> opening -> lightEscape ->
// pageEnter -> worldMorph (castle->forest->comic->video) -> pullOut -> universe
export const PHASE_SECONDS: Record<Exclude<IntroPhase, 'loading' | 'interactive'>, number> = {
  establish: 4,
  book: 3,
  opening: 3,
  lightEscape: 2,
  pageEnter: 3,
  worldMorph: 9,
  pullOut: 3,
  universe: 4,
  heroText: 3,
};

/** Phases kept in the trimmed sequence (skips the standalone light/pull-out beats). */
export const SHORT_SEQUENCE: IntroPhase[] = [
  'establish',
  'book',
  'opening',
  'pageEnter',
  'worldMorph',
  'universe',
  'heroText',
];

/** Minimum time the loading screen stays up even if the bundle is warm (ms). */
export const MIN_LOADING_MS = 850;
/** Black-fade duration when the viewer presses Skip (ms). */
export const SKIP_FADE_MS = 480;

/* ── Camera keyframes ─────────────────────────────────────────────────────── */
// position (p*) + look-at target (t*) in world units, plus vertical FOV.
// The rig eases toward `cam` every frame — keep deltas gentle (motion sickness).
export type CamKey = {
  px: number; py: number; pz: number;
  tx: number; ty: number; tz: number;
  fov: number;
};

export const CAMERA: Record<Exclude<IntroPhase, 'loading'>, CamKey> = {
  // She's already there, standing near the floating book — camera drifts to reveal both.
  establish:   { px: 0.9,  py: 0.95, pz: 8,    tx: -0.4, ty: 0.55, tz: 0,   fov: 50 },
  book:        { px: 0,    py: 1.05, pz: 7.2,  tx: 0.15, ty: 0.65, tz: 0,   fov: 50 },
  opening:     { px: 0,    py: 0.85, pz: 5.2,  tx: 0,    ty: 0.8,  tz: 0,   fov: 47 },
  lightEscape: { px: 0,    py: 0.75, pz: 4.2,  tx: 0,    ty: 0.85, tz: 0,   fov: 50 },
  pageEnter:   { px: 0,    py: 0.4,  pz: 1,    tx: 0,    ty: 0.4,  tz: -8,  fov: 64 },
  // Camera holds relatively steady here — the WORLDS morph past it, it doesn't fly.
  worldMorph:  { px: 0,    py: 0.1,  pz: -3,   tx: 0,    ty: 0.1,  tz: -14, fov: 58 },
  pullOut:     { px: 0,    py: 1,    pz: 9,    tx: 0,    ty: 0.5,  tz: -3,  fov: 54 },
  universe:    { px: 0,    py: 1.2,  pz: 15,   tx: 0,    ty: 0.55, tz: -2,  fov: 56 },
  heroText:    { px: 0,    py: 1.15, pz: 14,   tx: 0,    ty: 0.6,  tz: -2,  fov: 55 },
  interactive: { px: 0,    py: 1.15, pz: 14,   tx: 0,    ty: 0.6,  tz: -2,  fov: 55 },
};

/* ── World-morph (page becomes castle -> forest -> comic panels -> video) ──── */
export type WorldFragmentSpec = {
  key: string;
  label: string;
  /** Two-stop gradient the fragment is colour-graded toward (procedural fallback). */
  grade: [string, string];
  accent: string;
};

// Order matters — this is the literal morph chain, not a shuffled montage.
// Each optionally reads `/landing/world-<key>.jpg` (see landing-assets.ts) and
// falls back to the graded procedural silhouette when that file is absent.
export const WORLD_FRAGMENTS: WorldFragmentSpec[] = [
  { key: 'castle', label: 'A kingdom above the clouds', grade: ['#1b3a6b', '#0a1830'], accent: '#cfe0ff' },
  { key: 'forest', label: 'A forest that glows', grade: ['#0f3d2e', '#04140f'], accent: '#6bf0b8' },
  { key: 'comic', label: 'Panels of ink and thunder', grade: ['#3a1f10', '#160a04'], accent: '#ffcf6b' },
  { key: 'video', label: 'A story caught mid-scene', grade: ['#3a1030', '#0c0906'], accent: '#ff9ecb' },
];

/* ── Floating story objects (Scene 5 hero) ────────────────────────────────── */
export type StoryObjectSpec = {
  title: string;
  meta: string; // "Genre • Type"
  kind: 'book' | 'comic' | 'card' | 'screen' | 'portal';
};

// Placeholder catalogue — swap for real titles, or wire to live data later.
export const STORY_OBJECTS: StoryObjectSpec[] = [
  { title: 'THE LAST KINGDOM',    meta: 'Fantasy • Story',   kind: 'book' },
  { title: 'BEYOND THE STARS',    meta: 'Sci-Fi • Comic',    kind: 'comic' },
  { title: 'WHEN WE MET',         meta: 'Romance • Story',   kind: 'card' },
  { title: 'THE FORGOTTEN ONE',   meta: 'Fantasy • Film',    kind: 'screen' },
  { title: 'ASH & EMBER',         meta: 'Dark Fantasy • Story', kind: 'book' },
  { title: 'PAPER MOONS',         meta: 'Slice of Life • Comic', kind: 'comic' },
  { title: 'THE TIDE KEEPER',     meta: 'Adventure • Story',  kind: 'card' },
  { title: 'NEON HOLLOW',         meta: 'Cyberpunk • Comic',  kind: 'comic' },
  { title: 'A LETTER FOR NOBODY', meta: 'Drama • Story',      kind: 'card' },
  { title: 'GARDEN OF STATIC',    meta: 'Mystery • Film',     kind: 'screen' },
  { title: 'CROWNS OF DUST',      meta: 'Epic Fantasy • Story', kind: 'book' },
  { title: 'THE QUIET SIGNAL',    meta: 'Sci-Fi • Story',     kind: 'portal' },
];

/* ── Hero copy ────────────────────────────────────────────────────────────── */
export const HERO_COPY = {
  headline: 'EVERY STORY OPENS A WORLD.',
  subheading: 'Read stories. Discover comics. Watch unforgettable worlds come to life.',
  primary: 'ENTER THE STORY',
  secondary: 'EXPLORE STORIES',
};

export const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Stories', href: '/explore' },
  { label: 'Comics', href: '/explore' },
  { label: 'Videos', href: '/explore' },
  { label: 'Discover', href: '/explore' },
];

/** localStorage key — bump the suffix to force every visitor through the intro again. */
export const SEEN_KEY = 'elyra:intro:v1';
