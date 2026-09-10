import { APP_NAME } from '@/config/app';
import { NAV_LINKS, PALETTE } from '@/components/landing/introConfig';

/**
 * The site nav. Invisible during the cinematic, then fades/solidifies once
 * `revealed`. Links are intentionally simple — swap the text logo for
 * `<BrandLogo/>` and point hrefs wherever you like (see NAV_LINKS in
 * introConfig).
 */
type Props = {
  revealed: boolean;
  onNav: (href: string) => void;
  onSignIn: () => void;
  onRegister: () => void;
};

export function Navigation({ revealed, onNav, onSignIn, onRegister }: Props) {
  return (
    <nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)',
        zIndex: 35,
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(-12px)',
        transition: 'opacity .8s ease, transform .8s ease, background .8s ease',
        background: revealed
          ? 'linear-gradient(180deg, rgba(2,16,12,.72), rgba(2,16,12,0))'
          : 'transparent',
        backdropFilter: revealed ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: revealed ? 'blur(8px)' : 'none',
        pointerEvents: revealed ? 'auto' : 'none',
      }}>
      <button
        type="button"
        className="elyra-link"
        onClick={() => onNav('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: PALETTE.gold,
            boxShadow: `0 0 12px ${PALETTE.gold}`,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 3,
            color: PALETTE.text,
          }}>
          {APP_NAME.toUpperCase()}
        </span>
      </button>

      <div className="elyra-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {NAV_LINKS.map((l) => (
          <button
            key={l.label}
            type="button"
            className="elyra-link"
            onClick={() => onNav(l.href)}
            style={navLink}>
            {l.label}
          </button>
        ))}
        <button type="button" className="elyra-link" onClick={onSignIn} style={navLink}>
          Sign In
        </button>
        <button
          type="button"
          className="elyra-btn"
          onClick={onRegister}
          style={{
            fontFamily: 'var(--display)',
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            fontWeight: 700,
            color: '#1c1206',
            background: PALETTE.gold,
            border: 'none',
            borderRadius: 999,
            padding: '9px 18px',
            cursor: 'pointer',
          }}>
          Register
        </button>
      </div>
    </nav>
  );
}

const navLink: React.CSSProperties = {
  fontFamily: 'var(--display)',
  fontSize: 13,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: PALETTE.textDim,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};
