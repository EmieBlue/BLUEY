import { PALETTE } from '@/components/landing/introConfig';

/**
 * Corner controls during the cinematic: skip to the hero, or bail straight into
 * the site. Hidden once the intro has handed over. `Esc` also skips (wired in
 * CinematicIntro).
 */
export function SkipIntro({
  hidden,
  onSkip,
  onExplore,
}: {
  hidden: boolean;
  onSkip: () => void;
  onExplore: () => void;
}) {
  return (
    <div
      className="elyra-skip"
      style={{
        position: 'absolute',
        top: 22,
        right: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        zIndex: 45,
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(-8px)' : 'none',
        transition: 'opacity .4s ease, transform .4s ease',
        pointerEvents: hidden ? 'none' : 'auto',
      }}>
      <button
        type="button"
        className="elyra-link"
        onClick={onExplore}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--display)',
          fontSize: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: PALETTE.textDim,
        }}>
        Explore Now
      </button>
      <button
        type="button"
        className="elyra-btn"
        onClick={onSkip}
        style={{
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.18)',
          borderRadius: 999,
          padding: '8px 16px',
          cursor: 'pointer',
          fontFamily: 'var(--display)',
          fontSize: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: PALETTE.text,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}>
        Skip Intro →
      </button>
    </div>
  );
}
