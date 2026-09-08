// Writes the Android launcher icons straight into the native project at the
// correct per-density resolutions:
//   - adaptive layers at a full 108dp (capacitor-assets only emits 48dp, which
//     the system then upscales), background full-bleed, foreground in the
//     66% safe zone
//   - legacy square + round PNGs for API < 26
//   - a monochrome layer so Android 13+ themed icons work
// Run via `npm run assets`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'android/app/src/main/res';
const BG = '#0a0b12';

// dp -> px multiplier per density bucket.
const DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

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

const plate = (s) => `
  <rect width="${s}" height="${s}" fill="${BG}"/>
  <rect width="${s}" height="${s}" fill="url(#sky)"/>
  <rect width="${s}" height="${s}" fill="url(#floor)"/>`;

/** The chain mark. `mono` renders the themed-icon silhouette. */
const chain = (s, mono = false) => {
  const lit = mono ? '#ffffff' : 'url(#lit)';
  const warm = mono ? '#ffffff' : 'url(#warm)';
  const cool = mono ? '#ffffff' : 'url(#cool)';
  const wire = mono ? '#ffffff' : 'url(#wire)';
  const defs = mono
    ? ''
    : `
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
  </defs>`;

  const highlights = mono
    ? ''
    : `
    <circle cx="${s * 0.222}" cy="${s * 0.586}" r="${s * 0.03}" fill="#ffffff" opacity="0.55"/>
    <circle cx="${s * 0.468}" cy="${s * 0.464}" r="${s * 0.034}" fill="#ffffff" opacity="0.5"/>
    <circle cx="${s * 0.722}" cy="${s * 0.35}"  r="${s * 0.03}" fill="#ffffff" opacity="0.42"/>`;

  return `${defs}
  <g ${mono ? '' : 'filter="url(#glow)"'}>
    <path d="M ${s * 0.276} ${s * 0.606} L ${s * 0.5} ${s * 0.5}"
          stroke="${wire}" stroke-width="${s * 0.045}" stroke-linecap="round"/>
    <path d="M ${s * 0.5} ${s * 0.5} L ${s * 0.724} ${s * 0.394}"
          stroke="${wire}" stroke-width="${s * 0.045}" stroke-linecap="round"/>
    <circle cx="${s * 0.25}" cy="${s * 0.618}" r="${s * 0.108}" fill="${lit}"/>
    <circle cx="${s * 0.5}"  cy="${s * 0.5}"   r="${s * 0.122}" fill="${warm}"/>
    <circle cx="${s * 0.75}" cy="${s * 0.382}" r="${s * 0.108}" fill="${cool}"/>${highlights}
  </g>`;
};

const svg = (s, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${body}</svg>`;

/** Art scaled about the centre - keeps adaptive content inside the safe zone. */
const scaled = (s, k, body) =>
  `<g transform="translate(${s / 2} ${s / 2}) scale(${k}) translate(${-s / 2} ${-s / 2})">${body}</g>`;

const buf = (s, body) => Buffer.from(svg(s, body));

/** Clip a rendered square to a rounded rect / circle. */
async function masked(s, body, radius) {
  const mask = buf(s, `<rect width="${s}" height="${s}" rx="${radius}" ry="${radius}" fill="#fff"/>`);
  return sharp(buf(s, body))
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

let count = 0;
for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = `${OUT}/mipmap-${density}`;
  mkdirSync(dir, { recursive: true });

  const legacy = Math.round(48 * scale); // pre-API-26 launcher icon
  const layer = Math.round(108 * scale); // adaptive layer

  // Adaptive background: full bleed, no inset - the launcher mask does the
  // rounding, so any inset here shows as transparent corners.
  await sharp(buf(layer, gradients(layer) + plate(layer)))
    .png()
    .toFile(`${dir}/ic_launcher_background.png`);

  // Adaptive foreground: art at 66% so it survives every launcher mask, plus
  // the extra 0.72 the 108dp -> 72dp visible viewport eats.
  await sharp(buf(layer, scaled(layer, 0.72, chain(layer))))
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);

  // Themed (monochrome) layer for Android 13+.
  await sharp(buf(layer, scaled(layer, 0.72, chain(layer, true))))
    .png()
    .toFile(`${dir}/ic_launcher_monochrome.png`);

  const full = gradients(legacy) + plate(legacy) + chain(legacy);
  await sharp(await masked(legacy, full, legacy * 0.2)).toFile(`${dir}/ic_launcher.png`);
  await sharp(await masked(legacy, full, legacy / 2)).toFile(`${dir}/ic_launcher_round.png`);

  count += 5;
  console.log(`  mipmap-${density}  legacy ${legacy}px · adaptive ${layer}px`);
}

console.log(`${count} launcher icons written to ${OUT}`);
