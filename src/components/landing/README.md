# Cinematic landing (`src/components/landing/`)

The signed-out **web** home (`/`). Native apps keep `WelcomeHero` — Metro loads
`cinematic-landing.tsx` there instead of `cinematic-landing.web.tsx`, so no
three.js ships in the app bundle.

## Flow

```
(tabs)/index.tsx  ──!user && web──▶  <CinematicLanding/>  (cinematic-landing.web.tsx)
                                          │
             reduced-motion / weak GPU / already seen ──▶ <CalmLanding/>   (CSS only, no WebGL)
                                          │
                          first visit    └──▶ <CinematicIntro/>
                                                 ├─ <StoryScene/>   lazy — three/R3F/drei/postprocessing
                                                 ├─ <LoadingScreen/> <SkipIntro/> <HeroText/> <Navigation/> <AmbientAudio/>
                                                 └─ useIntroSequence()  — the timeline + phase machine
```

The sequence advances through phases `loading → establish → book → opening →
lightEscape → pageEnter → worldMorph → pullOut → universe → heroText →
interactive`: she's already standing by the floating book → it opens → light
escapes → the camera pushes into the page → the page becomes a castle, which
becomes a forest, which becomes comic panels, which becomes a video scene →
everything pulls back outward → the Story Universe hero appears. A
module-level `stage` object (`stage.ts`) holds the live values; the timeline
(`src/hooks/use-intro-sequence.ts`) eases them via a clamped
`requestAnimationFrame` loop seeking a paused GSAP timeline (immune to
background-tab throttling — see the comment at the top of that file), the R3F
components read them every frame, and React only re-renders on the coarse
`phase`.

## Customise

Almost everything is in **`introConfig.ts`**:

| Want to change… | Edit |
| --- | --- |
| Colours | `PALETTE` |
| Scene lengths / whole timing | `PHASE_SECONDS`, `SHORT_SEQUENCE` |
| Camera moves | `CAMERA` (position `p*`, look-at `t*`, `fov`) |
| The 4 world-morph stages | `WORLD_FRAGMENTS` (order = the morph chain — castle→forest→comic→video) |
| Floating hero titles | `STORY_OBJECTS` |
| Headline / buttons / nav links | `HERO_COPY`, `NAV_LINKS` |
| Replay the intro for everyone | bump `SEEN_KEY` |

Device tiers (particle counts, post-FX, short vs full sequence, how many of
the 4 world stages render) live in `src/lib/device-tier.ts`.

## Reference art (optional — see `public/landing/README.md`)

Every visual piece is procedural by default (no asset required). Drop
matching files into `public/landing/` and each one upgrades automatically on
refresh, no code change or rebuild needed:

- `book-cover.jpg` → painted onto `StoryBook3D`'s front cover (replaces the
  procedural emblem — the art is expected to already carry the symbol).
- `symbol.png` → the recurring glowing emblem used on the book (when no cover
  art) and as an accent on portals/hero objects (`three/symbol.tsx`).
- `character.png` → a soft rim-lit cutout for the story explorer, in place of
  the original stylized hooded-silhouette figure (`three/story-character.tsx`).
- `world-<castle|forest|comic|video>.jpg` → each world-morph backdrop, in
  place of the graded-gradient + procedural silhouette (`three/world-fragment.tsx`).

Loading is `src/lib/landing-assets.ts`'s `useOptionalTexture()` — it never
throws or suspends; a 404 just resolves to `null` so the caller renders its
fallback. This scoped-to-the-landing symbol is deliberately separate from the
app's actual Elyra quill logo/favicon (`BrandLogo`, `app.json`) — untouched.

## Dev helpers (URL params, dev console)

- `?intro=force` — always play the cinematic (ignores the "seen" flag)
- `?intro=calm` — always show the calm page
- `?tier=high|mid|low` — force a device tier (preview the mobile version on desktop)
- `window.__elyraSeek(seconds)` — jump the timeline while tuning
- `window.__elyra.stage` — inspect live state

## Swap in real 3D models later

`StoryBook3D` and `StoryCharacter` are procedural but structured for a GLTF drop-in
— load with `useGLTF(url)` / `useAnimations`, wire the same `stage` drivers
(`book.open`, `book.glow`, `character.appear`, `character.focus`) to the model's
bones / materials, and render it in place of the primitive group.

## Audio

`ui/ambient-audio.tsx` is a stub — the toggle remembers the viewer's choice but
plays nothing. Add an ambient loop to `assets/` and wire it where the comment
says. Never autoplay.
