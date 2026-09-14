// Generates the Play-ready source assets in resources/ from inline SVG.
// Run: node scripts/make-assets.mjs   (then: npm run assets)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BG = '#0a0b12';

/** The chain mark: three links, energy racing left -> right. */
const chain = (s) => `
  <defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${s * 0.028}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="lit" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="42%" stop-color="#5affe0"/>
      <stop offset="100%" stop-color="#00c9a9"/>
    </radialGradient>
    <radialGradient id="warm" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#fff3c4"/>
      <stop offset="45%" stop-color="#ffd24a"/>
      <stop offset="100%" stop-color="#f0a92b"/>
    </radialGradient>
    <radialGradient id="cool" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#b9cdff"/>
      <stop offset="45%" stop-color="#5b8cff"/>
      <stop offset="100%" stop-color="#3f6ade"/>
    </radialGradient>
    <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00e6c3"/>
      <stop offset="55%" stop-color="#5b8cff"/>
      <stop offset="100%" stop-color="#2c3a63"/>
    </linearGradient>
  </defs>

  <g filter="url(#glow)">
    <!-- connections -->
    <path d="M ${s * 0.276} ${s * 0.606} L ${s * 0.5} ${s * 0.5}"
          stroke="url(#wire)" stroke-width="${s * 0.045}" stroke-linecap="round"/>
    <path d="M ${s * 0.5} ${s * 0.5} L ${s * 0.724} ${s * 0.394}"
          stroke="url(#wire)" stroke-width="${s * 0.045}" stroke-linecap="round"/>

    <!-- links: activated -> activating -> dark -->
    <circle cx="${s * 0.25}" cy="${s * 0.618}" r="${s * 0.108}" fill="url(#lit)"/>
    <circle cx="${s * 0.5}"  cy="${s * 0.5}"   r="${s * 0.122}" fill="url(#warm)"/>
    <circle cx="${s * 0.75}" cy="${s * 0.382}" r="${s * 0.108}" fill="url(#cool)"/>

    <!-- highlights -->
    <circle cx="${s * 0.222}" cy="${s * 0.586}" r="${s * 0.03}" fill="#ffffff" opacity="0.55"/>
    <circle cx="${s * 0.468}" cy="${s * 0.464}" r="${s * 0.034}" fill="#ffffff" opacity="0.5"/>
    <circle cx="${s * 0.722}" cy="${s * 0.35}"  r="${s * 0.03}" fill="#ffffff" opacity="0.42"/>
  </g>`;

const bgLayer = (s, rx) => `
  <rect width="${s}" height="${s}" rx="${rx}" fill="${BG}"/>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#sky)"/>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#floor)"/>`;

const gradients = (s) => `
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#5b8cff" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="#5b8cff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#5b8cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="floor" cx="100%" cy="100%" r="85%">
      <stop offset="0%" stop-color="#00e6c3" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#00e6c3" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const svg = (s, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${body}</svg>`;

async function png(name, s, body) {
  await sharp(Buffer.from(svg(s, body))).png().toFile(`resources/${name}`);
  console.log('  resources/' + name);
}

mkdirSync('resources', { recursive: true });

const S = 1024;
// Full-bleed launcher icon (legacy / Play listing source).
await png('icon.png', S, gradients(S) + bgLayer(S, 0) + chain(S));

// Adaptive icon: background plate + foreground art shrunk into the 66% safe zone.
await png('icon-background.png', S, gradients(S) + bgLayer(S, 0));
await png(
  'icon-foreground.png',
  S,
  `<g transform="translate(${S * 0.5} ${S * 0.5}) scale(0.66) translate(${-S * 0.5} ${-S * 0.5})">${chain(S)}</g>`,
);

// Splash: one square, cropped to any screen.
const SP = 2732;
const splashBody =
  gradients(SP) +
  bgLayer(SP, 0) +
  `<g transform="translate(${SP * 0.5} ${SP * 0.5}) scale(0.42) translate(${-SP * 0.5} ${-SP * 0.5})">${chain(SP)}</g>`;
await png('splash.png', SP, splashBody);
await png('splash-dark.png', SP, splashBody);

// 512x512 Play Console listing icon.
await sharp(Buffer.from(svg(S, gradients(S) + bgLayer(S, 0) + chain(S))))
  .resize(512, 512)
  .png()
  .toFile('resources/play-store-icon-512.png');
console.log('  resources/play-store-icon-512.png');
