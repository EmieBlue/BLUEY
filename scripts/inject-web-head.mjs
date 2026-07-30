/**
 * Postbuild step for the web export.
 *
 * Expo's web `output: "single"` (see app.json) ignores `app/+html.tsx`, so there
 * is no Expo-native hook to add custom <head> tags for the single-page build.
 * This injects the site's branding/SEO/social-share metadata into the generated
 * `dist/index.html`. Because `public/_redirects` serves that one HTML file for
 * every route, these tags apply across the whole site.
 *
 * Values are read from `src/config/app.ts` so there's a single source of truth.
 * Run automatically via `npm run build:web` (expo export → this script).
 *
 * Usage:  node scripts/inject-web-head.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HTML_PATH = 'dist/index.html';
const CONFIG_PATH = 'src/config/app.ts';
const MARKER = '<!-- bluey-head -->';
const THEME_COLOR = '#023025';

function grab(source, name) {
  const m = source.match(new RegExp(`export const ${name}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`));
  if (!m) throw new Error(`Could not find ${name} in ${CONFIG_PATH}`);
  return m[1];
}

function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const config = readFileSync(CONFIG_PATH, 'utf8');
const appName = escapeAttr(grab(config, 'APP_NAME'));
const tagline = escapeAttr(grab(config, 'APP_TAGLINE'));
const siteUrl = grab(config, 'SITE_URL').replace(/\/$/, '');
const ogImage = `${siteUrl}/og-image.png`;

let html = readFileSync(HTML_PATH, 'utf8');

if (html.includes(MARKER)) {
  console.log('inject-web-head: tags already present, skipping.');
  process.exit(0);
}

const head = `    ${MARKER}
    <meta name="description" content="${tagline}" />
    <meta name="theme-color" content="${THEME_COLOR}" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${appName}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${appName}" />
    <meta property="og:title" content="${appName}" />
    <meta property="og:description" content="${tagline}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${appName}" />
    <meta name="twitter:description" content="${tagline}" />
    <meta name="twitter:image" content="${ogImage}" />
    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}</script>
  </head>`;

if (!html.includes('</head>')) throw new Error(`No </head> found in ${HTML_PATH}`);
html = html.replace('</head>', head);
writeFileSync(HTML_PATH, html);
console.log(`inject-web-head: injected branding/OG tags into ${HTML_PATH}`);
