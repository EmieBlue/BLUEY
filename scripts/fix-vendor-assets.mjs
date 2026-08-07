// Post-build fix for Cloudflare Pages.
//
// Expo exports the vector-icon fonts (and a few router assets) under
// `dist/assets/node_modules/@expo/vector-icons/.../*.ttf`. But
// `wrangler pages deploy` SKIPS every path containing `node_modules`, so those
// files never upload — the font URLs then 404, fall back to index.html, and
// every icon renders as an empty box. (Netlify uploaded them, so it only breaks
// on Cloudflare.)
//
// This step moves them out of the `node_modules` path: it renames
// `dist/assets/node_modules` → `dist/assets/libs` and rewrites every
// `assets/node_modules/` reference to `assets/libs/` across the built JS/CSS/HTML.

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const FROM = 'assets/node_modules'; // path segment wrangler skips
const TO = 'assets/libs'; // safe replacement
const oldDir = path.join(DIST, 'assets', 'node_modules');
const newDir = path.join(DIST, 'assets', 'libs');

if (!fs.existsSync(oldDir)) {
  console.log('fix-vendor-assets: nothing to do (no dist/assets/node_modules).');
  process.exit(0);
}

// 1) Move the folder out of the node_modules path.
fs.rmSync(newDir, { recursive: true, force: true });
fs.renameSync(oldDir, newDir);

// 2) Rewrite references in every text asset that could point at the old path.
const REWRITE_EXT = new Set(['.js', '.css', '.html', '.map', '.json']);
let filesChanged = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (REWRITE_EXT.has(path.extname(entry.name))) {
      const before = fs.readFileSync(p, 'utf8');
      if (before.includes(FROM)) {
        fs.writeFileSync(p, before.split(FROM).join(TO));
        filesChanged++;
      }
    }
  }
}

walk(DIST);
console.log(`fix-vendor-assets: moved fonts out of node_modules, rewrote ${filesChanged} file(s).`);
