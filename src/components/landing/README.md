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
                                                 └─ useIntroSequence()  — the GSAP timeline + phase machine
```

The 40-second sequence advances through phases
`loading → universe → book → character → approach → reach → opening → travel →
worlds → reveal → heroText → interactive`. A module-level `stage` object
(`stage.ts`) holds the live values; GSAP eases them, the R3F components read them
every frame, React only re-renders on the coarse `phase`.

## Customise

Almost everything is in **`introConfig.ts`**:

| Want to change… | Edit |
| --- | --- |
| Colours | `PALETTE` |
| Scene lengths / whole timing | `PHASE_SECONDS`, `SHORT_SEQUENCE` |
| Camera moves | `CAMERA` (position `p*`, look-at `t*`, `fov`) |
| The 6 flythrough worlds | `WORLD_FRAGMENTS` |
| Floating hero titles | `STORY_OBJECTS` |
| Headline / buttons / nav links | `HERO_COPY`, `NAV_LINKS` |
| Replay the intro for everyone | bump `SEEN_KEY` |

Device tiers (particle counts, post-FX, short vs full sequence) live in
`src/lib/device-tier.ts`.

## Dev helpers (URL params, dev console)

- `?intro=force` — always play the cinematic (ignores the "seen" flag)
- `?intro=calm` — always show the calm page
- `?tier=high|mid|low` — force a device tier (preview the mobile version on desktop)
- `window.__elyraSeek(seconds)` — jump the timeline while tuning
- `window.__elyra.stage` — inspect live state

## Swap in real 3D models later

`StoryBook3D` and `StoryCharacter` are procedural but structured for a GLTF drop-in
— load with `useGLTF(url)` / `useAnimations`, wire the same `stage` drivers
(`book.open`, `book.glow`, `character.walk`, `character.reach`) to the model's
bones / materials, and render it in place of the primitive group.

## Audio

`ui/ambient-audio.tsx` is a stub — the toggle remembers the viewer's choice but
plays nothing. Add an ambient loop to `assets/` and wire it where the comment
says. Never autoplay.
