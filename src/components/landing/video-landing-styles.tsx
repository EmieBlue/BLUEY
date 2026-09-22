export function VideoLandingStyles() {
  return <style>{`
.video-landing { width:100%; height:100svh; min-height:0; overflow-y:auto; flex:1; position:relative; background:#090b10; color:#f7f5f0; font-family:Inter,system-ui,sans-serif; }
.video-landing *, .video-landing *::before, .video-landing *::after { box-sizing:border-box; letter-spacing:0; }
.video-landing button, .video-landing a { -webkit-tap-highlight-color:transparent; }
.video-landing button { font:inherit; cursor:pointer; }
.video-landing a { color:inherit; text-decoration:none; }
.video-landing button:focus-visible, .video-landing a:focus-visible { outline:2px solid #f1d58f; outline-offset:5px; }
.intro-stage, .intro-boot { position:relative; min-height:100svh; isolation:isolate; }
.intro-boot { display:grid; place-items:center; }
.intro-boot span { position:relative; padding:12px 20px; background:#090b10; }
.intro-film, .intro-backdrop { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.intro-film { object-fit:contain; }
.intro-backdrop { z-index:-1; object-position:55% center; }
.intro-top-controls { position:absolute; top:max(20px,env(safe-area-inset-top)); right:max(24px,env(safe-area-inset-right)); z-index:4; }
.intro-control { min-height:44px; border:1px solid #ffffff45; background:#0a0c13cc; color:#fff; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; gap:10px; }
.intro-control:hover { background:#202431; }
.intro-skip { padding:0 16px; font-size:13px!important; }
.intro-icon { width:44px; flex-shrink:0; }
.intro-status, .intro-play-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.intro-status { background:#090b10b8; font-size:14px; }
.intro-play { display:flex; align-items:center; gap:12px; padding:16px 24px; color:#f8f1df; border:1px solid #e1c486; border-radius:6px; background:#0a0c13ed; pointer-events:auto; }
.intro-playback { position:absolute; z-index:4; bottom:max(20px,env(safe-area-inset-bottom)); left:24px; right:24px; display:flex; align-items:center; gap:10px; }
.intro-playback progress { flex:1; min-width:20px; height:4px; appearance:none; border:0; background:#ffffff40; color:#e1c486; }
.intro-playback progress::-webkit-progress-bar { background:#ffffff40; }
.intro-playback progress::-webkit-progress-value { background:#e1c486; }
.intro-playback progress::-moz-progress-bar { background:#e1c486; }
.intro-time { font-size:12px; font-variant-numeric:tabular-nums; padding:8px; white-space:nowrap; background:#090b10b8; border-radius:4px; }
.video-landing-content { position:relative; display:flex; flex-direction:column; min-height:100svh; background:linear-gradient(180deg,#090b1080 0%,#090b1000 28%,#090b1030 42%,#090b10ed 100%); animation:intro-reveal .8s ease both; }
.video-landing-header { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:24px 40px; flex-wrap:wrap; }
.video-brand { font-family:Georgia,serif; font-size:32px; font-weight:700; }
.video-landing-header nav, .video-account-links { display:flex; gap:24px; align-items:center; }
.video-landing-header nav { flex-wrap:wrap; }
.video-landing-header a, .video-account-links button { min-height:44px; display:inline-flex; align-items:center; }
.video-landing-header nav a, .video-account-links button { font-size:14px; }
.video-account-links button, .video-landing-footer button { color:inherit; border:0; background:none; padding:8px 0; }
.video-account-links .video-register { padding:8px 16px; border:1px solid #f1d58f80; border-radius:4px; }
.video-landing-hero { margin:auto auto 0; text-align:center; width:min(100%,820px); padding:100px 24px 24px; }
.video-landing-hero h1 { font-family:Georgia,'Times New Roman',serif; font-size:64px; line-height:1.06; font-weight:400; margin:0; text-shadow:0 2px 20px #090b10; }
.video-landing-hero h1:focus { outline:none; }
.video-landing-hero p { font-size:17px; line-height:1.6; max-width:490px; margin:20px auto 0; color:#e4e3df; }
.video-landing-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin:28px 0 0; }
.video-landing-actions button { display:inline-flex; align-items:center; justify-content:center; gap:12px; min-height:50px; padding:14px 24px; border-radius:4px; font-size:15px; font-weight:600; }
.video-primary { background:#ecd097; color:#17181c; border:1px solid #ecd097; }
.video-secondary { background:#10121b80; color:#fff; border:1px solid #ffffff70; }
.video-primary:hover { background:#f5dfb6; }
.video-secondary:hover { background:#262936; }
.video-landing-footer { padding:16px 24px max(24px,env(safe-area-inset-bottom)); text-align:center; }
.video-landing-footer button { display:inline-flex; align-items:center; gap:8px; min-height:44px; font-size:13px; color:#e2dac8; }
@keyframes intro-reveal { from { opacity:0; } to { opacity:1; } }
@media (max-width:760px) {
  .video-landing-header { padding:16px 20px; gap:8px 16px; }
  .video-brand { font-size:28px; }
  .video-account-links { gap:16px; margin-left:auto; }
  .video-landing-header nav { order:3; width:100%; justify-content:center; gap:24px; }
  .video-landing-hero { padding-top:140px; }
  .video-landing-hero h1 { font-size:44px; }
  .video-landing-hero p { font-size:15px; }
  .intro-backdrop { object-position:40% center; }
  .intro-playback { left:12px; right:12px; gap:8px; }
  .intro-top-controls { right:12px; }
}
@media (max-width:380px) {
  .video-landing-hero h1 { font-size:36px; }
  .video-landing-actions { flex-direction:column; }
  .video-landing-header nav { gap:18px; }
  .intro-time { font-size:10px; padding:4px; }
}
@media (max-height:500px) and (min-width:761px) {
  .video-landing-hero { padding-top:20px; }
  .video-landing-hero h1 { font-size:40px; }
}
@media (prefers-reduced-motion:reduce) {
  .video-landing-content { animation:none; }
}
`}</style>;
}
