/**
 * Generates the Elyra brand assets from the master logo art.
 *
 * Inputs (committed into the repo by this script the first time it runs, read
 * from the designer's exports): the full lockup on deep green (`Elyra-03`) and
 * on white (`Elyra-02`).
 *
 * Outputs:
 *  - assets/images/elyra-logo.png        transparent lockup (quill + ELYRA, no
 *                                         background) — used on the login/home
 *                                         hero, blends on any surface.
 *  - assets/images/elyra-icon.png (1024)  green-square app icon (app.json).
 *  - assets/images/elyra-adaptive.png     transparent lockup centred in the
 *                                         Android adaptive-icon safe zone.
 *  - public/icon-192.png, icon-512.png, apple-touch-icon.png  PWA / tab icons.
 *
 * Re-runnable. Usage:  node scripts/gen-elyra-assets.mjs
 */
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const DOWNLOADS = 'C:/Users/EGL-I.T DEPT/Downloads';
const SRC_GREEN = 'assets/images/elyra-logo-source.png';
const SRC_LIGHT = 'assets/images/elyra-logo-light.png';

// 1) Import the designer exports into the repo (once), as PNG.
if (!existsSync(SRC_GREEN)) {
  await sharp(`${DOWNLOADS}/Elyra-03.jpg.jpeg`).png().toFile(SRC_GREEN);
  console.log('imported', SRC_GREEN);
}
if (!existsSync(SRC_LIGHT)) {
  await sharp(`${DOWNLOADS}/Elyra-02.jpg.jpeg`).png().toFile(SRC_LIGHT);
  console.log('imported', SRC_LIGHT);
}

/**
 * Make the deep-green background transparent, keeping the gold quill + white
 * wordmark. The art is BRIGHT on a DARK background, so a luminance threshold is
 * a clean separator (background ~30/255, gold ~190, white 255). Feather the
 * mask edge, join it as alpha, then trim the empty margins.
 */
async function transparentLockup(size) {
  const resized = () => sharp(SRC_GREEN).resize(size, size, { fit: 'cover' });
  const { data: mask, info: mi } = await resized()
    .grayscale()
    .threshold(80)
    .blur(1.0) // soften the hard 0/255 edge into a smooth alpha ramp
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mc = mi.channels; // grayscale may still report 3 equal channels
  const { data: rgb } = await resized()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = size * size;
  const rgba = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p++) {
    rgba[p * 4] = rgb[p * 3];
    rgba[p * 4 + 1] = rgb[p * 3 + 1];
    rgba[p * 4 + 2] = rgb[p * 3 + 2];
    rgba[p * 4 + 3] = mask[p * mc];
  }
  return sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .trim({ threshold: 10 });
}

// 2) Transparent lockup for the hero (high-res, trimmed to the art).
await (await transparentLockup(1600)).toFile('assets/images/elyra-logo.png');
console.log('wrote assets/images/elyra-logo.png (transparent lockup)');

// 3) Green-square icons — crop the empty margin so the mark fills the square.
//    Source is 6000×6000; centre 64% frames quill + book + ELYRA nicely.
const squareCrop = () =>
  sharp(SRC_GREEN).extract({ left: 1080, top: 1080, width: 3840, height: 3840 });

for (const [file, size] of [
  ['assets/images/elyra-icon.png', 1024],
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
]) {
  await squareCrop().resize(size, size).png().toFile(file);
  console.log('wrote', file, `(${size}px green square)`);
}

// 4) Android adaptive foreground: transparent lockup at ~62% on a transparent
//    1024 canvas, so the circular mask never clips the ELYRA wordmark.
const fg = await (await transparentLockup(1200)).resize(640, 640, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg, gravity: 'center' }])
  .png()
  .toFile('assets/images/elyra-adaptive.png');
console.log('wrote assets/images/elyra-adaptive.png (adaptive foreground)');

console.log('done.');
