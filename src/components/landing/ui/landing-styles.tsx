/**
 * One <style> tag for the cinematic landing's DOM overlay — keyframes and the
 * few rules that need pseudo-elements / media queries (which inline styles
 * can't express). Mounted once by `CinematicLanding`.
 */
import { PALETTE } from '@/components/landing/introConfig';

export function LandingStyles() {
  return (
    <style
      // eslint-disable-next-line react-native/no-raw-text -- CSS string, web-only overlay
      dangerouslySetInnerHTML={{
        __html: `
.elyra-cine, .elyra-cine * { box-sizing: border-box; }
.elyra-cine {
  --gold: ${PALETTE.gold};
  --gold-soft: ${PALETTE.goldSoft};
  --emerald: ${PALETTE.emerald};
  --text: ${PALETTE.text};
  --serif: Georgia, 'Times New Roman', serif;
  --display: 'Spline Sans', Inter, ui-sans-serif, system-ui, sans-serif;
}

@keyframes elyra-pulse {
  0%, 100% { opacity: .55; transform: scale(.96); }
  50%      { opacity: 1;   transform: scale(1); }
}
@keyframes elyra-shimmer {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(320%); }
}
@keyframes elyra-sweep {
  0%   { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
  40%  { opacity: .9; }
  100% { transform: translateX(240%) skewX(-18deg); opacity: 0; }
}
@keyframes elyra-float-in {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes elyra-skipflash {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.elyra-skipflash { animation: elyra-skipflash .45s ease forwards; }

/* Headline glow-sweep — a highlight that passes across the text once revealed. */
.elyra-headline { position: relative; overflow: hidden; }
.elyra-headline.is-visible::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 0%, rgba(247,226,156,.85) 50%, transparent 100%);
  mix-blend-mode: screen;
  animation: elyra-sweep 1.6s ease-out .5s both;
  pointer-events: none;
}

.elyra-stagger > * { opacity: 0; }
.elyra-stagger.is-visible > * { animation: elyra-float-in .7s cubic-bezier(.2,.7,.2,1) both; }
.elyra-stagger.is-visible > *:nth-child(1) { animation-delay: .05s; }
.elyra-stagger.is-visible > *:nth-child(2) { animation-delay: .45s; }
.elyra-stagger.is-visible > *:nth-child(3) { animation-delay: .85s; }
.elyra-stagger.is-visible > *:nth-child(4) { animation-delay: 1.05s; }

.elyra-btn { transition: transform .18s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease; }
.elyra-btn:hover { transform: translateY(-2px); }
.elyra-btn:focus-visible { outline: 2px solid var(--gold-soft); outline-offset: 3px; }
.elyra-link:focus-visible { outline: 2px solid var(--gold-soft); outline-offset: 3px; border-radius: 4px; }

@media (max-width: 720px) {
  .elyra-nav-links { display: none !important; }
  .elyra-headline { font-size: clamp(30px, 9vw, 44px) !important; letter-spacing: 2px !important; }
  .elyra-sub { font-size: 15px !important; }
  .elyra-skip { top: auto !important; bottom: 18px !important; right: 14px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .elyra-cine * { animation: none !important; transition: none !important; }
  .elyra-headline::after { display: none !important; }
  /* No reveal animation — so show the content outright instead of leaving it at opacity 0. */
  .elyra-stagger.is-visible > * { opacity: 1 !important; }
  .elyra-skipflash { opacity: 0 !important; }
}
`,
      }}
    />
  );
}
