import { rmSync } from 'node:fs';

// Expo copies public/ wholesale. Keep the source movie locally; publish its
// optimized web copy so the release stays within Cloudflare Pages' file limit.
for (const filename of ['BlueyClub_intro.mp4', 'Elyra Web Intro.mp4']) {
  const exportedOriginal = new URL(`../dist/landing/${filename}`, import.meta.url);
  rmSync(exportedOriginal, { force: true });
}
console.log('prepare-landing-media: publishing the optimized intro; source movie retained in public/.');
