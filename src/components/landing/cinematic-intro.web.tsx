import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { MIN_LOADING_MS, PALETTE } from '@/components/landing/introConfig';
import type { IntroPhase } from '@/components/landing/stage';
import { AmbientAudio } from '@/components/landing/ui/ambient-audio';
import { HeroText } from '@/components/landing/ui/hero-text';
import { LoadingScreen } from '@/components/landing/ui/loading-screen';
import { Navigation } from '@/components/landing/ui/navigation';
import { SkipIntro } from '@/components/landing/ui/skip-intro';
import { useLandingActions } from '@/components/landing/use-landing-actions';
import { useIntroSequence } from '@/hooks/use-intro-sequence';
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
      <SkipIntro hidden={done} onSkip={doSkip} onExplore={actions.onExplore} />
      <AmbientAudio hidden={done} />

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
