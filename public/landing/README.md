# Cinematic landing — reference art drop zone

Drop image files here with these exact names to upgrade the cinematic landing's
procedural visuals to your reference art. **Everything is optional** — a
missing file just means that piece stays procedural. No rebuild needed: these
are plain static files, so a refresh picks up a newly-added one.

| File | Becomes | Size / format |
|---|---|---|
| `book-cover.jpg` | The storybook's front cover art | ~1200×1600, jpg/webp, < 400KB |
| `symbol.png` | The recurring glowing emblem (book, portals, loading glyph) | square, **transparent PNG**, ~512×512, < 120KB |
| `character.png` | The story explorer, as a soft-lit cutout | portrait, **transparent/soft-edge PNG** ideally, < 600KB |
| `world-castle.jpg` | World-morph stage 1 of 4 | wide (≥16:9), jpg/webp, < 500KB |
| `world-forest.jpg` | World-morph stage 2 of 4 | wide, < 500KB |
| `world-comic.jpg` | World-morph stage 3 of 4 | wide, < 500KB |
| `world-video.jpg` | World-morph stage 4 of 4 | wide, < 500KB |

See `src/components/landing/README.md` for how these are wired in
(`src/lib/landing-assets.ts`).
