/**
 * The director of the cinematic landing.
 *
 * A single GSAP timeline holds the *interpolation* (camera keyframes + the 0..1
 * element drivers on `stage`), but we advance it OURSELVES from a
 * requestAnimationFrame loop with a clamped delta — never GSAP's own ticker.
 * That keeps it immune to background-tab throttling / lag-smoothing (the intro
 * slows if the tab is hidden, it never fast-forwards past scenes) and lets the
 * discrete `phase` be derived straight from elapsed time.
 *
 * Three.js reads `stage` every frame; React only hears the coarse `phase` so it
 * can mount/unmount heavy groups and cue the DOM overlays. Not used on the
 * reduced-motion / low-tier path — `CalmLanding` renders instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

import { CAMERA, PHASE_SECONDS, SHORT_SEQUENCE } from '@/components/landing/introConfig';
import { PHASE_ORDER, resetStage, stage, type IntroPhase } from '@/components/landing/stage';

type ScenePhase = Exclude<IntroPhase, 'loading' | 'interactive'>;

const FULL_SEQUENCE = PHASE_ORDER.filter(
  (p) => p !== 'loading' && p !== 'interactive',
) as ScenePhase[];

type Options = {
  /** Start once true (the 3D module + assets are ready). */
  ready: boolean;
  /** Play the trimmed sequence (mobile / mid tier). */
  short?: boolean;
  onPhase?: (phase: IntroPhase) => void;
};

export type IntroSequence = {
  phase: IntroPhase;
  /** Jump straight to the interactive hero (also fired by the Esc key). */
  skip: () => void;
  replay: () => void;
};

export function useIntroSequence({ ready, short = false, onPhase }: Options): IntroSequence {
  const [phase, setPhaseState] = useState<IntroPhase>('loading');

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const phaseRef = useRef<IntroPhase>('loading');
  // Bumped on every run/skip/replay so an in-flight rAF step from a previous run
  // bails instead of resurrecting the loop.
  const runIdRef = useRef(0);

  const applyPhase = useCallback(
    (next: IntroPhase) => {
      if (phaseRef.current === next) return;
      phaseRef.current = next;
      stage.phase = next;
      setPhaseState(next);
      onPhase?.(next);
    },
    [onPhase],
  );

  const settleFinalState = useCallback(() => {
    Object.assign(stage.cam, CAMERA.interactive);
    stage.book = { appear: 0, glow: 0.5, open: 0, scale: 1 };
    stage.character = { appear: 1, focus: 1 };
    stage.burst = 0;
    stage.symbolSting = 0;
    stage.universe = 1;
    stage.vignette = 0.2;
    stage.t = 1;
    stage.done = true;
  }, []);

  /** Build the sequence + its cumulative phase schedule. */
  const build = useCallback(() => {
    const sequence = short ? FULL_SEQUENCE.filter((p) => SHORT_SEQUENCE.includes(p)) : FULL_SEQUENCE;

    const schedule: { phase: ScenePhase; start: number; end: number }[] = [];
    let cursor = 0;
    for (const p of sequence) {
      schedule.push({ phase: p, start: cursor, end: cursor + PHASE_SECONDS[p] });
      cursor += PHASE_SECONDS[p];
    }
    const total = cursor;

    const tl = gsap.timeline({ paused: true });
    sequence.forEach((p) => {
      const d = PHASE_SECONDS[p];
      tl.to(stage.cam, { ...CAMERA[p], duration: d, ease: 'power2.inOut' }, '>');
      addDrivers(tl, p, d, short);
    });
    tlRef.current = tl;
    return { tl, schedule, total };
  }, [short]);

  const stopRaf = useCallback(() => {
    runIdRef.current++; // invalidate any in-flight step
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }, []);

  const run = useCallback(() => {
    const { tl, schedule, total } = build();
    elapsedRef.current = 0;
    const myRun = ++runIdRef.current;

    const step = (ts: number) => {
      if (runIdRef.current !== myRun) return; // superseded by skip/replay/unmount
      if (lastTsRef.current == null) lastTsRef.current = ts;
      // Clamp: a hidden tab must slow the intro, never skip scenes.
      const dt = pausedRef.current ? 0 : Math.min((ts - lastTsRef.current) / 1000, 0.08);
      lastTsRef.current = ts;
      elapsedRef.current += dt;

      const t = Math.min(elapsedRef.current, total);
      tl.seek(t, false);
      stage.t = total > 0 ? t / total : 1;

      const seg = schedule.find((s) => t < s.end) ?? schedule[schedule.length - 1];
      applyPhase(seg.phase);

      if (elapsedRef.current < total || pausedRef.current) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        settleFinalState();
        applyPhase('interactive');
      }
    };

    rafRef.current = requestAnimationFrame(step);

    // Dev helpers for tuning: jump the playhead, and freeze it so a given
    // moment can actually be looked at (otherwise it keeps running as you look).
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __elyraSeek?: (s: number) => void;
        __elyraPause?: (v?: boolean) => boolean;
      };
      w.__elyraSeek = (s: number) => {
        elapsedRef.current = Math.max(0, Math.min(s, total));
      };
      w.__elyraPause = (v = true) => {
        pausedRef.current = !!v;
        return pausedRef.current;
      };
    }
  }, [build, applyPhase, settleFinalState]);

  // Kick off once ready.
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    resetStage();
    phaseRef.current = 'loading';
    run();
    return () => {
      stopRaf();
      tlRef.current?.kill();
    };
  }, [ready, run, stopRaf]);

  const skip = useCallback(() => {
    if (stage.done) return;
    stage.skipped = true;
    stopRaf();
    // Everything that matters is synchronous — no rAF/timeout that a backgrounded
    // tab could stall. The caller plays a short CSS flash over the cut.
    tlRef.current?.progress(1, false);
    settleFinalState();
    applyPhase('interactive');
  }, [stopRaf, settleFinalState, applyPhase]);

  const replay = useCallback(() => {
    stopRaf();
    tlRef.current?.kill();
    resetStage();
    phaseRef.current = 'loading';
    setPhaseState('loading');
    run();
  }, [stopRaf, run]);

  return { phase, skip, replay };
}

/* ── Per-phase element drivers ────────────────────────────────────────────── */
// Scenes 1-3 of the full brief only (README.md has the complete planned
// sequence — Scenes 4-14 aren't built yet, so `universe` here is a temporary
// hand-off into the existing hero reveal rather than the real Scene 7-14 bridge).
// `short` isn't branched on yet — nothing to trim at this length; kept for when
// Scenes 4-14 add mobile-skippable beats.
function addDrivers(tl: gsap.core.Timeline, phase: ScenePhase, d: number, _short: boolean) {
  switch (phase) {
    case 'darkness':
      // Nothing but atmosphere and a brief symbol "sting" — no character, no book yet.
      tl.to(stage, { vignette: 0.35, duration: d * 0.6, ease: 'sine.out' }, '<');
      tl.to(stage, { symbolSting: 1, duration: d * 0.35, ease: 'sine.out' }, '<');
      tl.to(stage, { symbolSting: 0, duration: d * 0.45, ease: 'sine.in' }, '>');
      break;
    case 'explorer':
      // She fades in and is idle/looking around (handled in the component itself);
      // a partial turn begins as she "notices" the book, which is just a soft
      // glow at the frame's edge for now — not yet in focus.
      tl.to(stage.character, { appear: 1, duration: d * 0.5, ease: 'sine.out' }, '<');
      // Only a hint of a turn here — she stays mostly front-on for her reveal,
      // and completes the turn to the book in Scene 3.
      tl.to(stage.character, { focus: 0.22, duration: d, ease: 'sine.inOut' }, '<');
      tl.to(stage.book, { appear: 0.25, duration: d * 0.4, ease: 'sine.out' }, '<');
      tl.to(stage, { vignette: 0.3, duration: d, ease: 'sine.inOut' }, '<');
      break;
    case 'bookDiscovered':
      tl.to(stage.book, { appear: 1, duration: d * 0.6, ease: 'power2.out' }, '<');
      tl.to(stage.book, { glow: 0.5, duration: d, ease: 'sine.inOut' }, '<');
      tl.to(stage.character, { focus: 1, duration: d * 0.8, ease: 'sine.inOut' }, '<');
      tl.to(stage, { vignette: 0.24, duration: d, ease: 'sine.inOut' }, '<');
      break;
    case 'universe':
      // Temporary — a brief flash stands in for the not-yet-built Scene 4-14
      // journey (walk/touch/open/fly-through) so the cut doesn't feel broken.
      tl.to(stage, { burst: 0.6, duration: d * 0.25, ease: 'power3.out' }, '<');
      tl.to(stage, { burst: 0, duration: d * 0.5, ease: 'sine.out' }, '>');
      tl.to(stage.book, { appear: 0, duration: d * 0.35, ease: 'sine.in' }, '<');
      tl.to(stage, { universe: 1, duration: d, ease: 'power2.out' }, '<');
      tl.to(stage, { vignette: 0.22, duration: d, ease: 'sine.inOut' }, '<');
      break;
    case 'heroText':
      tl.to(stage, { universe: 1, duration: d, ease: 'none' }, '<');
      break;
  }
}
