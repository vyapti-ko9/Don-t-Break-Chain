// Renders the Play Console store graphics in Chrome so they use the same
// self-hosted fonts and palette as the game itself.
//
//   node scripts/store-graphics.mjs
//
// Output: store/graphics/
//   feature-graphic.png   1024x500  (required by Play)
//   icon-512.png           512x512  (required by Play, no alpha)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const OUT = 'store/graphics';
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found');

mkdirSync(OUT, { recursive: true });

const b64 = (p) => readFileSync(p).toString('base64');
const BALOO = b64('public/fonts/baloo-2-var.woff2');
const INTER = b64('public/fonts/inter-var.woff2');

/** The three-link mark, sized to `s` pixels square. */
const chainMark = (s) => `
<svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none">
  <defs>
    <filter id="g" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="lit" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#fff"/><stop offset="42%" stop-color="#5affe0"/><stop offset="100%" stop-color="#00c9a9"/>
    </radialGradient>
    <radialGradient id="warm" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#fff3c4"/><stop offset="45%" stop-color="#ffd24a"/><stop offset="100%" stop-color="#f0a92b"/>
    </radialGradient>
    <radialGradient id="cool" cx="38%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#b9cdff"/><stop offset="45%" stop-color="#5b8cff"/><stop offset="100%" stop-color="#3f6ade"/>
    </radialGradient>
    <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00e6c3"/><stop offset="55%" stop-color="#5b8cff"/><stop offset="100%" stop-color="#2c3a63"/>
    </linearGradient>
  </defs>
  <g filter="url(#g)">
    <path d="M27.6 60.6 L50 50" stroke="url(#wire)" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M50 50 L72.4 39.4" stroke="url(#wire)" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="25" cy="61.8" r="10.8" fill="url(#lit)"/>
    <circle cx="50" cy="50" r="12.2" fill="url(#warm)"/>
    <circle cx="75" cy="38.2" r="10.8" fill="url(#cool)"/>
    <circle cx="22.2" cy="58.6" r="3" fill="#fff" opacity=".55"/>
    <circle cx="46.8" cy="46.4" r="3.4" fill="#fff" opacity=".5"/>
    <circle cx="72.2" cy="35" r="3" fill="#fff" opacity=".42"/>
  </g>
</svg>`;

const featureHtml = `
<style>
  @font-face { font-family:'Baloo 2'; font-weight:500 800; src:url(data:font/woff2;base64,${BALOO}) format('woff2'); }
  @font-face { font-family:'Inter'; font-weight:400 700; src:url(data:font/woff2;base64,${INTER}) format('woff2'); }
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    width:1024px;height:500px;overflow:hidden;background:#0a0b12;color:#f2f3f8;
    font-family:Inter,system-ui,sans-serif;
    background-image:
      radial-gradient(ellipse 70% 120% at 78% 40%, rgba(91,140,255,.30), transparent 60%),
      radial-gradient(ellipse 60% 100% at 8% 90%, rgba(0,230,195,.16), transparent 55%),
      radial-gradient(ellipse 50% 80% at 30% -10%, rgba(176,107,255,.14), transparent 60%);
  }
  .wrap{display:flex;align-items:center;height:100%;padding:0 64px;gap:36px}
  .copy{flex:1}
  .eyebrow{
    font-size:14px;font-weight:700;letter-spacing:.30em;text-transform:uppercase;
    color:#8fb0ff;margin-bottom:14px;
  }
  h1{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:64px;line-height:.94;letter-spacing:-.01em}
  h1 .grad{background:linear-gradient(100deg,#5b8cff,#8eb4ff 45%,#00e6c3);-webkit-background-clip:text;background-clip:text;color:transparent}
  p.tag{margin-top:16px;font-size:21px;color:#aab0c8;font-weight:500}
  .pills{margin-top:26px;display:flex;gap:9px;flex-wrap:wrap}
  .pill{
    border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.05);
    border-radius:999px;padding:8px 15px;font-size:13px;font-weight:600;color:#dfe3f2;
  }
  .art{width:330px;height:330px;display:grid;place-items:center;flex:none}
</style>
<div class="wrap">
  <div class="copy">
    <div class="eyebrow">Offline chain-reaction puzzle</div>
    <h1>DON'T BREAK<br><span class="grad">THE CHAIN</span></h1>
    <p class="tag">One mistake. Everything falls apart.</p>
    <div class="pills">
      <span class="pill">100 handcrafted levels</span>
      <span class="pill">Daily challenge</span>
      <span class="pill">No internet needed</span>
    </div>
  </div>
  <div class="art">${chainMark(330)}</div>
</div>`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await page.setContent(featureHtml, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(OUT, 'feature-graphic.png'), type: 'png' });
console.log(`  ${OUT}/feature-graphic.png  1024x500`);
await browser.close();

// Play rejects an icon with an alpha channel - flatten onto the game's ground.
await sharp('resources/icon.png')
  .resize(512, 512)
  .flatten({ background: '#0a0b12' })
  .png()
  .toFile(join(OUT, 'icon-512.png'));
console.log(`  ${OUT}/icon-512.png  512x512 (no alpha)`);
