import { Colors } from '@/constants/theme';

export function HuskyAuthStyles() {
  return <style>{`
    .elyra-auth { --den-background:${Colors.emeralddark.background}; --den-surface:${Colors.emeralddark.backgroundElement}e8; --den-text:${Colors.emeralddark.text}; --den-muted:${Colors.emeralddark.textSecondary}; --den-border:#355447; --den-gold:#ecd097; --den-gold-hover:#f5dfb6; height:100%; min-height:100%; overflow-y:auto; width:100%; box-sizing:border-box; background:var(--den-background); color:var(--den-text); font-family:Arial,sans-serif; display:flex; flex-direction:column; letter-spacing:0; color-scheme:dark; }
    .elyra-auth *, .elyra-auth *::before, .elyra-auth *::after { box-sizing:border-box; }
    .elyra-auth button, .elyra-auth input { font:inherit; letter-spacing:0; }
    .elyra-auth button { cursor:pointer; }
    .elyra-auth button:disabled { cursor:wait; opacity:.55; }
    .elyra-auth :focus-visible { outline:2px solid var(--den-gold); outline-offset:5px; }
    .elyra-auth h1:focus { outline:none; }
    .den-nav { padding:28px 40px; display:flex; flex-shrink:0; justify-content:space-between; align-items:center; gap:16px; }
    .den-back { display:flex; gap:10px; align-items:center; background:none; border:0; padding:10px 0; color:var(--den-muted); font-size:14px!important; }
    .den-back:hover { color:#fff; }
    .den-wordmark { color:var(--den-gold); text-decoration:none; display:flex; align-items:center; gap:10px; font:600 19px Georgia,serif; }
    .den-wordmark img { border-radius:6px; }
    .den-layout { width:min(940px,100%); padding:40px 30px 54px; margin:auto; display:grid; flex-shrink:0; grid-template-columns:minmax(240px,1fr) minmax(0,430px); align-items:center; gap:50px; }
    .den-companion { min-width:0; position:relative; }
    .den-husky { width:340px; max-width:100%; aspect-ratio:1; position:relative; margin:0 auto; isolation:isolate; }
    .den-face { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; user-select:none; }
    .den-paw { position:absolute; width:35%; height:35%; object-fit:contain; z-index:2; top:68%; pointer-events:none; transform-origin:50% 90%; transition:top 330ms cubic-bezier(.2,.8,.2,1),transform 330ms cubic-bezier(.2,.8,.2,1); }
    .den-paw-left { left:23%; transform:rotate(-8deg); }
    .den-paw-right { left:51%; transform:rotate(8deg); }
    .den-husky.is-covered .den-paw { top:30%; }
    .den-husky.is-covered .den-paw-left { transform:rotate(8deg); }
    .den-husky.is-covered .den-paw-right { transform:rotate(-8deg); }
    .den-companion-copy { margin-top:35px; text-align:center; }
    .den-companion-copy p { font:400 30px/1.3 Georgia,serif; color:var(--den-gold); margin:0 0 16px; }
    .den-companion-copy span { font-size:14px; color:var(--den-muted); }
    .den-card { position:relative; width:100%; padding:34px; border:1px solid var(--den-border); border-radius:24px; background:var(--den-surface); box-shadow:0 24px 80px #0006,0 0 55px #12a97e12; backdrop-filter:blur(22px); }
    .den-eyebrow { color:var(--den-gold); font-size:10px; font-weight:700; margin:0 0 15px; }
    .den-card h1 { font:400 38px/1.18 Georgia,serif; margin:0; overflow-wrap:anywhere; }
    .den-subtitle { margin:13px 0 26px; color:var(--den-muted); font-size:14px; line-height:1.6; }
    .den-modes { display:flex; border-bottom:1px solid var(--den-border); margin:0 0 26px; }
    .den-modes button { flex:1; min-height:44px; background:none; border:0; border-bottom:2px solid transparent; color:var(--den-muted); font-size:13px; }
    .den-modes button[aria-pressed=true] { border-bottom-color:var(--den-gold); color:var(--den-gold); }
    .den-card fieldset { margin:0; padding:0; border:0; min-width:0; }
    .den-field { margin-bottom:20px; }
    .den-field label { display:block; font-size:13px; font-weight:600; margin-bottom:9px; color:var(--den-text); }
    .den-field label span { color:var(--den-muted); font-weight:400; }
    .den-input-wrap { display:flex; align-items:center; gap:11px; height:52px; padding:0 14px; border:1px solid #527367; border-radius:10px; background:var(--den-background); color:var(--den-muted); transition:border-color 150ms,box-shadow 150ms; }
    .den-input-wrap:focus-within { border-color:var(--den-gold); box-shadow:0 0 0 3px #ecd09718; }
    .den-input-wrap input { background:transparent; border:0; border-radius:0; width:100%; min-width:0; height:100%; color:var(--den-text); font-size:16px; outline:none!important; }
    .den-input-wrap input::placeholder { color:var(--den-muted); }
    .den-input-wrap input:-webkit-autofill { -webkit-text-fill-color:var(--den-text); -webkit-box-shadow:0 0 0 100px var(--den-background) inset; caret-color:var(--den-text); }
    .den-eye { flex:none; width:36px; height:44px; display:grid; place-items:center; background:none; border:0; color:var(--den-muted); padding:0; margin-right:-8px; }
    .den-forgot { display:block; margin:-3px 0 23px auto; padding:5px 0; border:0; background:none; color:var(--den-gold); font-size:12px!important; }
    .den-submit { width:100%; min-height:52px; border-radius:10px; border:1px solid var(--den-gold); background:var(--den-gold); color:var(--den-background); font-weight:700!important; font-size:15px!important; display:flex; justify-content:center; align-items:center; gap:12px; padding:12px; box-shadow:0 4px 20px #ecd09716; transition:background 150ms; }
    .den-submit:hover:not(:disabled) { background:var(--den-gold-hover); }
    .den-footer { border-top:1px solid var(--den-border); margin-top:27px; padding-top:22px; text-align:center; font-size:12px; line-height:1.8; color:var(--den-muted); }
    .den-footer p { margin:0; }
    .den-text-button { background:none; border:0; padding:2px; color:var(--den-gold); font-size:inherit; font-weight:600!important; }
    .den-text-button:hover { text-decoration:underline; }
    .den-message { font-size:13px; line-height:1.6; margin:18px 0 0; overflow-wrap:anywhere; }
    .den-error { color:#ffb6b1; }
    .den-info { color:#a5e3cb; }
    .den-bottom { flex-shrink:0; color:var(--den-muted); font-size:12px; text-align:center; padding:12px 20px 25px; margin:0; line-height:1.8; }
    .den-bottom span { padding:0 8px; color:var(--den-border); }
    .den-sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .den-spinner { width:16px; height:16px; border:2px solid #04140f40; border-top-color:var(--den-background); border-radius:50%; animation:den-spin .8s linear infinite; }
    @keyframes den-spin { to { transform:rotate(360deg); } }
    @media(max-width:760px) {
      .den-nav { padding:12px 20px; }
      .den-wordmark { font-size:17px; }
      .den-layout { width:min(480px,100%); padding:2px 20px 30px; display:flex; flex-direction:column; gap:0; }
      .den-companion { width:100%; z-index:2; pointer-events:none; margin-bottom:-9px; }
      .den-husky { width:220px; height:185px; max-width:none; aspect-ratio:auto; }
      .den-face { height:220px; object-fit:contain; clip-path:inset(0 0 18% 0); }
      .den-paw { width:77px; height:77px; top:147px; }
      .den-paw-left { left:50.6px; }
      .den-paw-right { left:112.2px; }
      .den-husky.is-covered .den-paw { top:66px; }
      .den-companion-copy { display:none; }
      .den-card { padding:50px 26px 26px; }
      .den-card h1 { font-size:34px; }
      .den-eyebrow { margin-bottom:10px; }
      .den-subtitle { margin:10px 0 20px; }
      .den-field { margin-bottom:17px; }
    }
    @media(max-width:360px) {
      .den-layout { padding-left:12px; padding-right:12px; }
      .den-card { padding-left:20px; padding-right:20px; }
      .den-nav { padding-left:16px; padding-right:16px; }
    }
    @media(prefers-reduced-motion:reduce) {
      .elyra-auth *, .elyra-auth *::before, .elyra-auth *::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; }
    }
  `}</style>;
}
