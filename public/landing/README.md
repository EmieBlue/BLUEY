# Cinematic landing assets

This folder holds plain static files served at `/landing/...`.

## Active video intro

The current website uses `elyra-intro-v2.mp4`, an optimized 720p H.264
copy of the user's `Elyra Web Intro.mp4`, with stereo AAC audio. Preserve
the original. Playback starts muted, with a sound toggle available.
The web build excludes both original intro movies from the deployment output to respect
Cloudflare Pages' per-file size limit; the local source file is not removed.

`elyra-intro-v2-opening.jpg` and `elyra-intro-v2-poster.jpg` are extracted
opening and ending frames for loading and the final landing respectively.
The older images below remain art references; they are not a gallery.

## Inactive 3D character architecture

Only if returning to a real-time 3D approach, put the rigged explorer here:

```
public/landing/character/character.glb
```

Recommended optional animation files for the next cinematic passes:

```
public/landing/character/idle.glb
public/landing/character/walk.glb
public/landing/character/reach.glb
public/landing/character/touch.glb
```

The character should be a proper humanoid GLB/GLTF, ideally Mixamo-compatible,
with the visual direction from the reference art: young woman, long hair, dark
flowing coat, boots, elegant fantasy/adventure styling.

## Reference art

These image/video files can still live here as art direction for later world
passes, but the new cinematic should not display them as floating gallery cards:

| File | Purpose |
|---|---|
| `book-cover.jpg` | Storybook visual reference |
| `character.png` | Explorer appearance reference; full scene, not a rigged model |
| `symbol.png` | Golden storytelling symbol reference |
| `world-castle.jpg` | Fantasy world reference |
| `world-forest.jpg` | Magical forest reference |
| `world-comic.jpg` | Comic world reference |
| `world-video.jpg` | Final story universe composition: explorer, castle, portals and libraries |
| `world-video.mp4` | Optional moving reference |

See `src/components/landing/README.md` for the active implementation.
