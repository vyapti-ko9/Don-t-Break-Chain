// Captures Play Store screenshots from the production build in dist/, driving
// the real UI in Chrome with a seeded save so the shots show a played-in game
// rather than an empty one.
//
//   npm run build && node scripts/screenshots.mjs            # phone only
//   node scripts/screenshots.mjs phone tablet-7 tablet-10    # pick sizes
//
// Output: store/screenshots/<size>/*.png
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import puppeteer from 'puppeteer-core';

const DIST = 'dist';
const OUT = 'store/screenshots';
const PORT = 4178;

// Every preset lands on a size Play accepts: each side 320-3840 px and an
// aspect ratio no narrower than 9:16.
const PRESETS = {
  phone: { width: 360, height: 640, deviceScaleFactor: 3 }, // 1080x1920
  'tablet-7': { width: 600, height: 960, deviceScaleFactor: 2 }, // 1200x1920
  'tablet-10': { width: 800, height: 1280, deviceScaleFactor: 2 }, // 1600x2560
};

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const sizes = requested.length ? requested : ['phone'];
for (const s of sizes) if (!PRESETS[s]) throw new Error(`unknown size "${s}"`);

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found - add its path to CHROME in this script');

// --- static server for dist/ ------------------------------------------------

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^([/\\])+/, '');
  try {
    const body = await readFile(join(DIST, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

// --- a save that looks like a couple of weeks of play ------------------------

const DAY = Math.floor(Date.now() / 86_400_000);
const levels = {};
for (let id = 1; id <= 62; id += 1) {
  // Mostly 3 stars early, tapering off as the worlds get harder.
  const stars =
    id <= 20 ? 3 : id <= 40 ? (id % 5 === 0 ? 2 : 3) : id % 3 === 0 ? 2 : id % 7 === 0 ? 1 : 3;
  levels[id] = {
    completed: true,
    stars,
    bestTimeSec: Number((3.4 + (id % 11) * 0.7).toFixed(2)),
    bestMistakes: id % 4 === 0 ? 1 : 0,
    attempts: 1 + (id % 3),
    hintsUsed: id % 9 === 0 ? 1 : 0,
  };
}

const SAVE = {
  version: 1,
  settings: { sound: true, haptics: true, reducedMotion: false },
  currentLevel: 63,
  levels,
  achievements: Object.fromEntries(
    [
      'first-link',
      'chain-starter',
      'chain-builder',
      'chain-master',
      'world-1',
      'world-2',
      'world-3',
      'perfect-chain',
      'flawless-10',
      'star-collector',
      'star-hoarder',
      'no-mistakes-10',
      'no-hint-20',
      'long-chain',
      'daily-1',
      'daily-7',
      'streak-3',
      'persistent',
    ].map((id, i) => [id, Date.now() - (i + 1) * 3_600_000]),
  ),
  daily: { day: DAY, bestTimeSec: 6.42, completed: true },
  streak: { count: 6, lastDay: DAY },
  hintBalance: 4,
  stats: {
    totalAttempts: 148,
    totalMistakes: 37,
    totalCompletions: 62,
    longestChain: 14,
    bestTimeSec: 2.71,
    dailyCompletions: 9,
    levelsNoMistake: 44,
    levelsNoHint: 55,
  },
};

// --- capture ----------------------------------------------------------------

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const size of sizes) {
  const viewport = PRESETS[size];
  const dir = join(OUT, size);
  mkdirSync(dir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument((save) => {
    localStorage.setItem('dbtc.save.v1', JSON.stringify(save));
  }, SAVE);

  const shot = async (name) => {
    await page.screenshot({ path: join(dir, `${name}.png`), type: 'png' });
    console.log(`  ${dir}/${name}.png`);
  };

  /** Click the first button whose text contains `text` (case-insensitive). */
  const tap = async (text, settle = 900) => {
    const ok = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('button,[role="button"],a')];
      const el = els.find((e) => (e.textContent ?? '').toLowerCase().includes(t.toLowerCase()));
      el?.click();
      return Boolean(el);
    }, text);
    if (!ok) throw new Error(`no clickable element containing "${text}"`);
    await wait(settle);
  };

  /** Best-effort tap; returns false instead of throwing when nothing matches. */
  const tryTap = async (text, settle = 700) => {
    try {
      await tap(text, settle);
      return true;
    } catch {
      return false;
    }
  };

  /** Click a numbered tile in the level grid. */
  const tapLevel = async (n, settle = 1600) => {
    const ok = await page.evaluate((num) => {
      const grids = [...document.querySelectorAll('.grid')].filter((g) =>
        g.className.includes('grid-cols-4'),
      );
      for (const g of grids) {
        for (const b of g.querySelectorAll('button')) {
          const label = /^(\d+)/.exec((b.textContent ?? '').trim())?.[1];
          if (label === String(num) && !b.disabled) {
            b.click();
            return true;
          }
        }
      }
      return false;
    }, n);
    if (!ok) throw new Error(`level ${n} not found in the grid`);
    await wait(settle);
  };

  /** HUD "LINKS x/y" -> x, i.e. how much of the chain is lit. */
  const litLinks = () =>
    page.evaluate(() => {
      const m = /LINKS\s+(\d+)\s*\/\s*(\d+)/i.exec(document.body.innerText);
      return m ? Number(m[1]) : 0;
    });

  /**
   * Link centres, found by scanning the canvas for saturated blobs - the board
   * is drawn imperatively, so there is nothing in the DOM to click.
   */
  const findNodes = () =>
    page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return [];
      const ctx = c.getContext('2d');
      const W = c.width;
      const H = c.height;
      const px = ctx.getImageData(0, 0, W, H).data;
      const rect = c.getBoundingClientRect();
      const scale = rect.width / W;
      const radius = 26 / scale; // a link is ~26 CSS px across

      const clusters = [];
      for (let y = 0; y < H; y += 4) {
        for (let x = 0; x < W; x += 4) {
          const i = (y * W + x) * 4;
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const mx = Math.max(r, g, b);
          // Saturated + bright picks out the link discs and skips the wires.
          if (mx < 70 || mx - Math.min(r, g, b) < 38) continue;
          const hit = clusters.find((cl) => Math.hypot(cl.x - x, cl.y - y) < radius);
          if (hit) {
            hit.sx += x;
            hit.sy += y;
            hit.n += 1;
            hit.x = hit.sx / hit.n;
            hit.y = hit.sy / hit.n;
          } else {
            clusters.push({ x, y, sx: x, sy: y, n: 1 });
          }
        }
      }
      return clusters
        .filter((cl) => cl.n >= 12)
        .map((cl) => ({ x: rect.left + cl.x * scale, y: rect.top + cl.y * scale, n: cl.n }))
        .sort((a, b) => b.n - a.n);
    });

  /**
   * Tap links until one actually starts the chain, then shoot while the energy
   * is still travelling. Wrong taps are undone with the restart button.
   */
  const shootChainReaction = async (name, delayMs = 200) => {
    const nodes = await findNodes();
    if (!nodes.length) throw new Error('no links found on the canvas');
    for (const node of nodes) {
      await page.mouse.click(node.x, node.y);
      await wait(delayMs);
      if ((await litLinks()) > 0) {
        await shot(name);
        return true;
      }
      if (!(await tryTap('RETRY', 900))) await tryTap('\u21bb', 900);
      await wait(300);
    }
    return false;
  };

  const home = async () => {
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await wait(2900); // let the splash hand over to Home
  };

  console.log(
    `\n${size} - ${viewport.width * viewport.deviceScaleFactor}x${viewport.height * viewport.deviceScaleFactor}`,
  );

  await home();
  await shot('01-home');

  await tap('Levels');
  await page.evaluate(() => document.querySelector('.scroll-area')?.scrollTo(0, 0));
  await wait(400);
  await shot('02-level-select');

  await tapLevel(12);
  await shot('03-gameplay-board');
  await shootChainReaction('04-chain-reaction');
  // The chain finishes on its own - catch the result screen.
  await wait(2600);
  await shot('05-level-complete');

  await home();
  await tap('Levels');
  // Scroll to a world that is part-way done rather than the all-locked last one.
  await page.evaluate(() => {
    const banner = [...document.querySelectorAll('.world-banner')].find((b) =>
      (b.textContent ?? '').includes('Chaos'),
    );
    banner?.scrollIntoView({ block: 'start' });
  });
  await wait(600);
  await shot('06-worlds');

  await tapLevel(61).catch(() => tapLevel(41));
  await shot('07-world-briefing');
  await tryTap('GOT IT', 700);
  await shootChainReaction('08-chain-reaction-late');

  await home();
  await tap('Daily');
  await wait(500);
  await shot('09-daily-challenge');

  await home();
  await tap('Achievements');
  await wait(500);
  await shot('10-achievements');

  await home();
  await tap('Statistics');
  await wait(500);
  await shot('11-statistics');

  await page.close();
}

await browser.close();
server.close();
console.log(`\nDone - ${sizes.join(', ')} in ${OUT}/`);
