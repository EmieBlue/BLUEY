import { HERO_COPY, PALETTE } from '@/components/landing/introConfig';

/**
 * The hero message. Nothing shows until `visible` (the timeline reveals the
 * world first). Then: headline floats in and a glow sweeps across it, the
 * subheading follows, then the buttons — all via the `.elyra-stagger` /
 * `.elyra-headline` rules in landing-styles.
 */
type Props = {
  visible: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
  onSignIn: () => void;
  onRegister: () => void;
};

export function HeroText({ visible, onPrimary, onSecondary, onSignIn, onRegister }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px',
        zIndex: 30,
        pointerEvents: 'none',
      }}>
      {/* Soft scrim so the copy stays readable over a busy scene. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 'min(1100px, 120vw)',
          height: 'min(620px, 80vh)',
          background:
            'radial-gradient(ellipse at center, rgba(2,16,12,0.62) 0%, rgba(2,16,12,0.34) 45%, transparent 72%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1s ease',
          pointerEvents: 'none',
        }}
      />
      <div
        className={`elyra-stagger ${visible ? 'is-visible' : ''}`}
        style={{ maxWidth: 780, position: 'relative' }}>
        <h1
          className={`elyra-headline ${visible ? 'is-visible' : ''}`}
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 700,
            fontSize: 'clamp(34px, 5.6vw, 68px)',
            lineHeight: 1.05,
            letterSpacing: 4,
            color: PALETTE.text,
            textShadow: '0 6px 40px rgba(0,0,0,.55)',
          }}>
          {HERO_COPY.headline}
        </h1>

        <p
          className="elyra-sub"
          style={{
            margin: '20px auto 0',
            maxWidth: 560,
            fontFamily: 'var(--display)',
            fontSize: 17,
            lineHeight: 1.6,
            color: PALETTE.textDim,
          }}>
          {HERO_COPY.subheading}
        </p>

        <div
          style={{
            marginTop: 34,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
            pointerEvents: visible ? 'auto' : 'none',
          }}>
          <button type="button" className="elyra-btn" onClick={onPrimary} style={primaryBtn}>
            {HERO_COPY.primary}
          </button>
          <button type="button" className="elyra-btn" onClick={onSecondary} style={ghostBtn}>
            {HERO_COPY.secondary}
          </button>
        </div>

        <div
          style={{
            marginTop: 22,
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            pointerEvents: visible ? 'auto' : 'none',
          }}>
          <button type="button" className="elyra-link" onClick={onSignIn} style={textLink}>
            Sign In
          </button>
          <span style={{ color: 'rgba(255,255,255,.25)' }}>·</span>
          <button type="button" className="elyra-link" onClick={onRegister} style={textLink}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  fontFamily: 'var(--display)',
  fontSize: 14,
  letterSpacing: 2,
  textTransform: 'uppercase',
  fontWeight: 700,
  color: '#1c1206',
  background: `linear-gradient(180deg, ${PALETTE.goldSoft}, ${PALETTE.gold})`,
  border: 'none',
  borderRadius: 999,
  padding: '15px 30px',
  cursor: 'pointer',
  boxShadow: '0 12px 40px rgba(232,196,107,.3)',
};

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--display)',
  fontSize: 14,
  letterSpacing: 2,
  textTransform: 'uppercase',
  fontWeight: 600,
  color: PALETTE.text,
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.28)',
  borderRadius: 999,
  padding: '15px 30px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const textLink: React.CSSProperties = {
  fontFamily: 'var(--display)',
  fontSize: 13,
  letterSpacing: 1.5,
  color: PALETTE.textDim,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};
