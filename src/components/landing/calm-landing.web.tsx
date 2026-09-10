import { useMemo } from 'react';

import { PALETTE } from '@/components/landing/introConfig';
import { HeroText } from '@/components/landing/ui/hero-text';
import { Navigation } from '@/components/landing/ui/navigation';
import { useLandingActions } from '@/components/landing/use-landing-actions';

/**
 * The calm path — shown to returning visitors, `prefers-reduced-motion`, and
 * low-power devices. No WebGL: a deep CSS nebula with a couple of very slow
 * drifting glows and a static star layer, then the same hero + nav. Still meant
 * to feel like a doorway into a story universe, just without the 40-second trip.
 */
export function CalmLanding({
  markSeen,
  canReplay,
  onReplay,
}: {
  markSeen: () => void;
  canReplay: boolean;
  onReplay: () => void;
}) {
  const actions = useLandingActions(markSeen);
  const stars = useMemo(() => makeStarShadow(140), []);

  return (
    <div
      className="elyra-cine"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(1200px 800px at 50% 18%, ${PALETTE.space2} 0%, ${PALETTE.space1} 45%, ${PALETTE.space0} 100%)`,
      }}>
      {/* Slow drifting glows */}
      <div style={glow('-10% 0%', 'rgba(18,169,126,.22)', '60s')} />
      <div style={glow('70% 8%', 'rgba(232,196,107,.14)', '80s')} />
      <div style={glow('40% 70%', 'rgba(18,169,126,.16)', '90s')} />

      {/* Static star layer (single element, box-shadow speckles) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 2,
          height: 2,
          borderRadius: '50%',
          background: 'transparent',
          boxShadow: stars,
          opacity: 0.6,
        }}
      />

      <HeroText
        visible
        onPrimary={actions.onPrimary}
        onSecondary={actions.onSecondary}
        onSignIn={actions.onSignIn}
        onRegister={actions.onRegister}
      />
      <Navigation
        revealed
        onNav={actions.onNav}
        onSignIn={actions.onSignIn}
        onRegister={actions.onRegister}
      />

      {canReplay && (
        <button
          type="button"
          className="elyra-link"
          onClick={onReplay}
          style={{
            position: 'absolute',
            bottom: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--display)',
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: PALETTE.textDim,
          }}>
          ▶ Watch the intro
        </button>
      )}
    </div>
  );
}

function glow(pos: string, color: string, dur: string): React.CSSProperties {
  const [x, y] = pos.split(' ');
  return {
    position: 'absolute',
    left: x,
    top: y,
    width: '55vmax',
    height: '55vmax',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
    filter: 'blur(30px)',
    animation: `elyra-pulse ${dur} ease-in-out infinite`,
    pointerEvents: 'none',
  };
}

/** Build a big `box-shadow` string of random white dots — a cheap starfield. */
function makeStarShadow(n: number): string {
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(Math.random() * 2000);
    const y = Math.round(Math.random() * 1200);
    const a = (0.2 + Math.random() * 0.6).toFixed(2);
    parts.push(`${x}px ${y}px rgba(255,255,255,${a})`);
  }
  return parts.join(', ');
}
