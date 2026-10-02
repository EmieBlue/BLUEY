# Husky Login Assets

Generated with the built-in image-generation tool on October 2, 2026.
The atlas was mechanically split into three transparent WebP sprites:

- `husky-face.webp`: unchanging face and chest, 768x768.
- `husky-paw-left.webp`: left paw, 384x384.
- `husky-paw-right.webp`: right paw, 384x384.

These are layered 3D-style raster illustrations, not a real-time 3D model.
CSS moves the same two paws over the unchanged face. The decorative mascot
receives a boolean activity state, never password contents. No security
guarantee is implied by its animation.

## Generation Prompt

Use case: stylized-concept. Asset type: a production layered sprite atlas
for a reactive website login mascot, NOT a UI mockup. Make one 1536x1024
transparent PNG sprite sheet with precisely three separate nonoverlapping
assets. LEFT 1024x1024 region: a single front-facing cute premium 3D-rendered
husky HEAD AND UPPER CHEST ONLY, centered, ears fully visible, NO arms or
paws attached. Gray ears and forehead, symmetric white muzzle and cheeks,
very large glossy blue eyes looking forward, small black nose, tiny warm
smile, soft detailed plush fur, refined rounded animation-film character.
Frame head and chest in left region with at least 70px transparent padding.
RIGHT 512x1024 region: TWO matching detached white fluffy front forepaws of
that exact husky, one centered in the upper 512x512 square and one in the
lower 512x512 square. Both forepaws seen from their fluffy backs with rounded
toe tips at top and wrists at bottom; NO visible paw pads, no extra toes,
no arms, no objects. Left and right forepaws mirror each other, identical
fur/material; broad enough to fully cover one eye each when placed over the
face. Clear generous transparent separation between all sprites. Soft cool
studio light with subtle warm highlights, no background, no ground, no
shadows outside the cutouts, no border, no lettering, no UI, no symbols or
accessories, no blue glow effect. This is one consistent character split
into three animation layers, so anatomy proportions must match. Face eye
shapes, gray ears, nose, and paws will be reused unchanged in every frame.
