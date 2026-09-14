import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { MIN_LOADING_MS, PALETTE } from '@/components/landing/introConfig';
import { stage, type IntroPhase } from '@/components/landing/stage';
import { AmbientAudio } from '@/components/landing/ui/ambient-audio';
import { HeroText } from '@/components/landing/ui/hero-text';
import { LoadingScreen } from '@/components/landing/ui/loading-screen';
import { Navigation } from '@/components/landing/ui/navigation';
import { SkipIntro } from '@/components/landing/ui/skip-intro';
import { useLandingActions } from '@/components/landing/use-landing-actions';
import { useIntroSequence } from '@/hooks/use-intro-sequence';
import { ASSET_URL } from '@/lib/landing-assets';
import type { TierProfile } from '@/lib/device-tier';

// Code-split: three.js / R3F / drei / postprocessing only download for a
// signed-out web visitor who actually reaches the cinematic.
const StoryScene = lazy(() => import('@/components/landing/story-scene.web'));

/**
 * The full auto-playing experience: lazy WebGL scene under a loading screen, a
 * phase machine (`useIntroSequence`), and the DOM overlays that come and go with
 * the phase. `onSeen` persists the "don't replay" flag but does NOT unmount the
 * cinematic — the hero stays until the visitor leaves or reloads.
 */
/**
 * Scene 1's symbol. Driven directly off the timeline value rather than a CSS
 * keyframe — a keyframe runs on wall-clock time, so it desyncs the moment the
 * timeline is slowed (hidden tab) or paused (tuning), and the symbol would be
 * long gone by the time the scene it belongs to is on screen.
 */
function SymbolSting() {
  const el = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = stage.symbolSting;
      if (el.current) {
        el.current.style.opacity = String(v);
        el.current.style.transform = `scale(${0.88 + v * 0.14})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 25,
      }}>
      <img
        ref={el}
        src={ASSET_URL.symbol}
        alt=""
        style={{
          width: 'min(190px, 22vw)',
          opacity: 0,
          filter: 'drop-shadow(0 0 34px rgba(232,196,107,0.45))',
        }}
      />
    </div>
  );
}

export function CinematicIntro({ profile, onSeen }: { profile: TierProfile; onSeen: () => void }) {
  const [sceneReady, setSceneReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const ready = sceneReady && minElapsed;

  const [phase, setPhase] = useState<IntroPhase>('loading');
  const [skipFlash, setSkipFlash] = useState(0);
  const onPhase = useCallback((p: IntroPhase) => setPhase(p), []);
  const { skip } = useIntroSequence({ ready, short: profile.shortSequence, onPhase });

  const actions = useLandingActions(onSeen);

  const doSkip = useCallback(() => {
    setSkipFlash((n) => n + 1); // remount the CSS flash overlay
    skip();
  }, [skip]);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'interactive') onSeen();
  }, [phase, onSeen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'interactive') doSkip();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, doSkip]);

  const heroVisible = phase === 'heroText' || phase === 'interactive';
  const done = phase === 'interactive';
  // Scene 1 is meant to be completely clean — no buttons, no chrome, nothing but
  // the dark and the particles. Esc still skips the whole way through.
  const chromeHidden = done || phase === 'loading' || phase === 'darkness';

  // Dev inspection: `window.__elyraIntro` in the console.
  if (typeof window !== 'undefined') {
    (window as unknown as { __elyraIntro?: unknown }).__elyraIntro = { phase, sceneReady, ready };
  }

  return (
    <div
      className="elyra-cine"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: PALETTE.space0 }}>
      <Suspense fallback={null}>
        <StoryScene phase={phase} profile={profile} onReady={() => setSceneReady(true)} />
      </Suspense>

      <LoadingScreen visible={!ready} />

      {/* Scene 1 — the symbol surfaces out of the dark, then is gone. Done as a
          DOM overlay rather than in-scene geometry: it's a single centred glyph
          on an otherwise black frame, so 3D buys nothing and costs camera-space
          positioning bugs. */}
      {phase === 'darkness' && <SymbolSting />}

      <HeroText
        visible={heroVisible}
        onPrimary={actions.onPrimary}
        onSecondary={actions.onSecondary}
        onSignIn={actions.onSignIn}
        onRegister={actions.onRegister}
      />
      <Navigation
        revealed={done}
        onNav={actions.onNav}
        onSignIn={actions.onSignIn}
        onRegister={actions.onRegister}
      />
      <SkipIntro hidden={chromeHidden} onSkip={doSkip} onExplore={actions.onExplore} />
      <AmbientAudio hidden={chromeHidden} />

      {/* Short black flash over the hard cut when the intro is skipped. */}
      {skipFlash > 0 && (
        <div
          key={skipFlash}
          className="elyra-skipflash"
          style={{ position: 'absolute', inset: 0, background: '#000', pointerEvents: 'none', zIndex: 60 }}
        />
      )}
    </div>
  );
}
