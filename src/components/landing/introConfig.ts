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

/* ── World positions (shared between the character, the book and the camera) ─ */
// She stands off-centre; the book sits apart from her, out of full view until
// Scene 3 — Scene 2 is about her alone, with the book only a soft glow at the
// frame's edge. Ground level for both is the same so she visibly "stands".
export const GROUND_Y = -0.95;
export const CHARACTER_POS: [number, number, number] = [-1.2, GROUND_Y, 0.3];
// Floats at roughly her chest height — close enough that reaching out to touch
// it in Scene 5 will read naturally, high enough to look suspended, not resting.
export const BOOK_POS: [number, number, number] = [2.0, 0.15, -1.6];

/* ── Timeline ─────────────────────────────────────────────────────────────── */
// Each phase's DURATION in seconds. Scenes 1-3 of the full brief only (see
// README.md for the complete planned sequence — Scenes 4-14 aren't built yet).
export const PHASE_SECONDS: Record<Exclude<IntroPhase, 'loading' | 'interactive'>, number> = {
  darkness: 4,
  explorer: 6,
  bookDiscovered: 5,
  universe: 4,
  heroText: 3,
};

/** Currently identical to the full sequence — nothing to trim yet at this length;
 *  mobile/mid-tier gets its cuts back once Scenes 4-14 land. */
export const SHORT_SEQUENCE: IntroPhase[] = ['darkness', 'explorer', 'bookDiscovered', 'universe', 'heroText'];

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

// Note on framing: aim `t*` at what should be CENTRED in frame, not above it.
// She spans y -0.95..0.75, so her centre is ~y=-0.05 — targeting y=0.85 would
// put her at the bottom edge.
export const CAMERA: Record<Exclude<IntroPhase, 'loading'>, CamKey> = {
  // Almost nothing happens — a barely-perceptible forward drift.
  darkness:       { px: -1.8, py: 0.5,  pz: 7.5, tx: -1.0,  ty: 0.2,   tz: 0.2,  fov: 45 },
  // Over-the-shoulder: camera behind/left of her, she's a backlit silhouette in
  // the foreground, the book's glow beyond her shoulder to the right.
  explorer:       { px: -3.7, py: 0.35, pz: 2.1, tx: -1.15, ty: 0.05,  tz: 0.25, fov: 42 },
  // Wide two-shot: she holds the left of frame in profile, the book is the
  // subject to the right, at a three-quarter angle so its thickness reads.
  bookDiscovered: { px: -2.6, py: 0.55, pz: 2.6, tx: 0.5,   ty: 0.0,   tz: -0.7, fov: 52 },
  // Temporary hand-off into the existing hero reveal — Scenes 4-14 will bridge this properly.
  universe:       { px: 0,    py: 1.2,  pz: 15,  tx: 0,    ty: 0.55, tz: -2,   fov: 56 },
  heroText:       { px: 0,    py: 1.15, pz: 14,  tx: 0,    ty: 0.6,  tz: -2,   fov: 55 },
  interactive:    { px: 0,    py: 1.15, pz: 14,  tx: 0,    ty: 0.6,  tz: -2,   fov: 55 },
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
