# Video landing intro

The signed-out website home at `/` uses the user's supplied cinematic video.
It is part of the Expo app, not `Downloads/Elyra-Promo.html`.

## Active flow

```
src/app/(tabs)/index.tsx
  -> cinematic-landing.web.tsx (visit and accessibility preferences)
  -> cinematic-intro.web.tsx (HTML video playback and recovery)
  -> video-landing-ui.tsx (website reveal and existing navigation actions)
```

`video-intro-config.ts` identifies the media files and visit-storage key.
`video-intro-state.ts` handles playback state and autoplay policy.
`video-landing-styles.tsx` contains scoped desktop/mobile styles.

The former Three.js components remain as inactive development work. The active
landing no longer imports the scene, probes a GPU, loads a GLB or runs GSAP.
Signed-in home, native screens, authentication and backend code are unchanged.

## Media

- `public/landing/Elyra Web Intro.mp4`: supplied replacement, preserved unchanged.
- `public/landing/elyra-intro-v2.mp4`: H.264 1280x720 web copy, about 15 MB,
  with the MP4 metadata before the media data for progressive playback.
- `public/landing/elyra-intro-v2-opening.jpg`: opening-symbol loading poster.
- `public/landing/elyra-intro-v2-poster.jpg`: final universe frame, used after
  completion, skipping, reduced motion, data saving, or playback failure.

The replacement contains stereo AAC audio. `INTRO_MEDIA.hasAudio` is true,
so the sound control is available. Playback starts muted. Versioned media URLs
avoid stale cached imagery, and the v2 visit key lets returning signed-out
visitors see the replacement once, subject to their accessibility preferences.

## Behavior

First-time visitors get the video. After completion or skip, returning visitors
get the final landing and can select Watch the intro. Replay starts from zero.
The video is not mounted or downloaded for reduced-motion/data-saving visits.
Explicit replay remains available. A motion preference change stops playback.

Skip is available during loading as well as playback; Escape also skips.
Pause/resume controls remain available. Blocked autoplay offers a Play button.
Errors or 15 seconds of loading/buffering reveal the usable website instead of
blocking access. Leaving the intro releases the video resource. Hidden tabs
pause playback and can be resumed explicitly.

The whole landscape movie remains visible on portrait screens instead of
cropping out the character or book. The final page can scroll on short screens.
No reference images are shown as floating cards.

## Verification

Run `node --test scripts/test-video-intro.cjs`, `npx tsc --noEmit` and
`npm run build:web`. The state tests cover first visits, returning visitors,
accessibility overrides, late events after skip, replay and progress bounds.

On a running local server:
- `/?intro=force`: preview playback even after watching (still respects reduced
  motion and data saving).
- `/?intro=calm`: preview the final static landing.

Browser checks still required: desktop/portrait/short-screen framing, actual
autoplay and blocked autoplay, pause/resume, skip before loading, complete
playback, replay, keyboard focus, missing media, and navigation to auth/explore.
Frame extraction verifies supplied imagery, not the rendered website behavior.

Production uses `.github/workflows/deploy.yml`: a push to `master` builds and
deploys `dist` to the Cloudflare Pages project `bluey`, production branch `main`.
The Netlify configuration is legacy. `prepare-landing-media.mjs` excludes
both original intro movies from `dist`; it preserves the originals in `public`.
The service worker leaves video and byte-range requests to the browser.
