import { rmSync } from 'node:fs';

// Expo copies public/ wholesale. Keep the source movie locally; publish its
// optimized web copy so the release stays within Cloudflare Pages' file limit.
const exportedOriginal = new URL('../dist/landing/BlueyClub_intro.mp4', import.meta.url);
rmSync(exportedOriginal, { force: true });
console.log('prepare-landing-media: publishing the optimized intro; source movie retained in public/.');
