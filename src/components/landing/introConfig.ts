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
export const PHASE_SECONDS: Record<Exclude<IntroPhase, 'loading' | 'interactive'>, number> = {
  universe: 3,
  book: 3,
  character: 4,
  approach: 4,
  reach: 3,
  opening: 4,
  travel: 4,
  worlds: 7,
  reveal: 5,
  heroText: 3,
};

/** Phases kept in the trimmed sequence (no character, condensed world montage). */
export const SHORT_SEQUENCE: IntroPhase[] = [
  'universe',
  'book',
  'reach',
  'opening',
  'travel',
  'worlds',
  'reveal',
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
  universe:    { px: 0,    py: 1.6,  pz: 12,   tx: 0,    ty: 0.4,  tz: 0,  fov: 58 },
  book:        { px: 0,    py: 1.1,  pz: 7.4,  tx: 0,    ty: 0.6,  tz: 0,  fov: 52 },
  character:   { px: 0.35, py: 0.9,  pz: 7.6,  tx: -0.5, ty: 0.35, tz: 0,  fov: 54 },
  approach:    { px: 0.2,  py: 0.85, pz: 6.8,  tx: -0.3, ty: 0.45, tz: 0,  fov: 51 },
  reach:       { px: 0.1,  py: 0.8,  pz: 6,    tx: -0.15, ty: 0.6, tz: 0,  fov: 49 },
  opening:     { px: 0,    py: 0.8,  pz: 4.6,  tx: 0,   ty: 0.8, tz: 0,   fov: 46 },
  travel:      { px: 0,    py: 0.4,  pz: 1.2,  tx: 0,   ty: 0.4, tz: -6,  fov: 62 },
  worlds:      { px: 0,    py: 0,    pz: -4,   tx: 0,   ty: 0,   tz: -16, fov: 70 },
  reveal:      { px: 0,    py: 1.0,  pz: 14,   tx: 0,   ty: 0.5, tz: -2,  fov: 55 },
  heroText:    { px: 0,    py: 1.1,  pz: 13,   tx: 0,   ty: 0.6, tz: -2,  fov: 54 },
  interactive: { px: 0,    py: 1.1,  pz: 13,   tx: 0,   ty: 0.6, tz: -2,  fov: 54 },
};

/* ── World fragments (Scene 4 flythrough) ─────────────────────────────────── */
export type WorldFragmentSpec = {
  key: string;
  label: string;
  /** Two-stop gradient the fragment is colour-graded toward. */
  grade: [string, string];
  accent: string;
};

export const WORLD_FRAGMENTS: WorldFragmentSpec[] = [
  { key: 'castle',    label: 'A kingdom above the clouds', grade: ['#1b3a6b', '#0a1830'], accent: '#cfe0ff' },
  { key: 'forest',    label: 'A forest that glows',        grade: ['#0f3d2e', '#04140f'], accent: '#6bf0b8' },
  { key: 'comic',     label: 'Panels of ink and thunder',  grade: ['#3a1f10', '#160a04'], accent: '#ffcf6b' },
  { key: 'romance',   label: 'Two hearts under the lights', grade: ['#3a1030', '#160616'], accent: '#ff9ecb' },
  { key: 'future',    label: 'A city of holograms',        grade: ['#0a2a3a', '#04121a'], accent: '#7be0ff' },
  { key: 'cinema',    label: 'A story caught mid-frame',    grade: ['#241a12', '#0c0906'], accent: '#f0d6a8' },
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
