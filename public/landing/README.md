# Cinematic landing assets

This folder holds plain static files served at `/landing/...`.

## Active video intro

The current website uses `blueyclub-intro-web.mp4`, an optimized 720p H.264
copy of the user's `BlueyClub_intro.mp4`. Preserve the original. The video
has no audio track.
The web build excludes the original from the deployment output to respect
Cloudflare Pages' per-file size limit; the local source file is not removed.

`blueyclub-intro-opening.jpg` and `blueyclub-intro-poster.jpg` are extracted
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
