import { PALETTE } from '@/components/landing/introConfig';

/**
 * Shown while the 3D module downloads. A softly pulsing book glyph, a line of
 * copy, and an indeterminate shimmer bar. Fades out (kept mounted briefly) once
 * `visible` goes false so the hand-off to the scene isn't a hard cut.
 */
export function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: PALETTE.space0,
        opacity: visible ? 1 : 0,
        transition: 'opacity .6s ease',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 40,
      }}>
      {/* Book glyph */}
      <div style={{ position: 'relative', width: 64, height: 64, animation: 'elyra-pulse 2.4s ease-in-out infinite' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background: 'linear-gradient(150deg, #2a2016, #171009)',
            border: `1px solid ${PALETTE.gold}`,
            boxShadow: `0 0 26px 2px rgba(232,196,107,.35), inset 0 0 12px rgba(232,196,107,.25)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 8,
            bottom: 8,
            left: '50%',
            width: 1,
            background: 'rgba(232,196,107,.5)',
          }}
        />
      </div>

      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 15,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: PALETTE.textDim,
        }}>
        Opening the story…
      </div>

      <div
        style={{
          position: 'relative',
          width: 170,
          height: 2,
          borderRadius: 2,
          background: 'rgba(255,255,255,.08)',
          overflow: 'hidden',
        }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${PALETTE.gold}, transparent)`,
            animation: 'elyra-shimmer 1.4s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
