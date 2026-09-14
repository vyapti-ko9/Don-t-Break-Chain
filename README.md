# Don't Break the Chain

**One mistake. Everything falls apart.**

A satisfying chain-reaction puzzle game. Find the one correct link, tap it, and
watch the energy race through the whole chain. 100 handcrafted levels across five
worlds, a new deterministic Daily Challenge every day, 24 achievements, streaks,
stats - and it all runs **fully offline**.

Built with **React + Vite + TypeScript + Tailwind CSS + HTML5 Canvas**, with a
**Capacitor-ready** architecture for Google Play.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no emit |
| `npm run phone` | Build + sync + install on a **physical** Android phone |

## Android / Capacitor

The web build is self-contained (relative `base`, no backend, no network). To
wrap it for the Play Store:

```bash
npm run build
npx cap add android          # first time only  (or: npm run cap:add:android)
npx cap sync                  # copy dist/ into the native project
npx cap open android          # open in Android Studio -> build APK/AAB
```

### Run on your phone

1. Enable **Developer options** → **USB debugging** on the phone
2. Plug in the phone and accept the debugging prompt
3. Run:

```bash
npm run phone
```

That builds the web app, syncs Capacitor, then installs/launches on the connected
physical device (emulators are skipped). Check the connection with `adb devices`
if it fails.

`npm run cap:sync` runs `build` + `cap sync` in one step. App id and name live in
[`capacitor.config.ts`](./capacitor.config.ts).

Installed native plugins: `@capacitor/app` (hardware back button),
`@capacitor/haptics`, `@capacitor/status-bar`. All are optional at runtime - the
game degrades gracefully in a plain browser.

---

## Architecture

React renders **screens, menus, HUD and modals**. An imperative canvas
**game engine** renders and simulates the board - the two are decoupled: engine
state never lives in React state, and HUD numbers are pushed out at ~10 Hz via
callbacks so the 60 fps loop is never blocked by re-renders.

```
src/
├── game/
│   ├── engine/       GameEngine, GameLoop (rAF + clamped dt), Particles,
│   │                 board mapping (normalized -> device px, DPR-aware), renderer
│   ├── objects/      ChainNode (state, motion, merger counters), ChainConnection, Pulse
│   ├── levels/       builder.ts (recipe -> LevelDef compiler) + world1..world5 recipes
│   └── types.ts
├── data/             levels.ts (assembles 100), daily.ts (seeded generator), achievements.ts
├── utils/            storage (single source of truth), audio (WebAudio synth), haptics, rng, format
├── services/         monetization (inert boundary for future AdMob/IAP), share, platform (Capacitor glue)
├── hooks/            useSaveData (useSyncExternalStore over storage), useSettings
├── components/       GameCanvas, ResultOverlay, HintSheet, StarRating, ProgressBar, Modal, Toast
├── pages/            Splash, Home, LevelSelect, Game, DailyChallenge, Achievements, Statistics, Settings
├── navigation.tsx    tiny stack router (no react-router; friendlier to WebView)
└── App.tsx
```

### The game loop

`requestAnimationFrame` with delta time clamped to 50 ms (tab-switch safe).
Every frame: run due scheduled events → update node motion & animation →
advance energy pulses (arrival = activation) → decay edge glow → update
particles → decay screen shake → evaluate win/lose → throttled HUD emit → render
with a shake transform.

### Win / lose

A level is **won** when every *required* node is active and no pulses are in
flight. It is **lost** on: activating a bomb, a countdown expiring (level or
per-node timer), running out of taps, exceeding the level's **mistake budget**,
or the chain going quiet with required nodes still dark ("CHAIN BROKEN").

### Difficulty curve

Hard from level 1, on purpose. Applied globally in
[`data/levels.ts`](./src/data/levels.ts) on top of every compiled level: `par`
is tightened (`×0.72`), **every level in every world carries a one-mistake
budget** (`maxMistakes = 1` — one wrong tap ends the run, period), and every
level has a **clock**, derived from its own par when the recipe didn't author
one explicitly. The last five levels of each world get an extra squeeze.
Pulses travel fast (`PULSE_SPEED 1.5`) and a broken path is called within
`~0.38 s` (`SETTLE_DELAY`). Bombs, fake/hidden wiring, scrambled order,
non-obvious starts and `maxTaps: 1` one-shot levels start appearing in World 1,
not held back for later worlds. Every level (and the Daily Challenge, sampled
over thousands of simulated days) is verified solvable by a headless
propagation simulation before shipping — see the level-authoring gotchas below
if you add more. Achievements earned during a run are shown on the result
screen - no in-play overlays.

### Level-authoring gotchas

- A layout's default chain (`line`, `grid`, `circle`, ...) wires *every*
  consecutive index automatically. Placing a `bomb` at an index inside that
  sequence gives it a real incoming edge unless you route around it with
  `order` (or hand-write `edges` on a `custom` layout).
- In an `allReverse` recipe, every edge must point **toward** the start, and
  any node that needs to relay the pulse further upstream must stay
  `type: 'reverse'`. Motion (`moving`) is independent of `type`, so a mid-chain
  mover stays reverse-safe with an explicit `types: {i: {type: 'reverse'}}`
  override; `delay`/`timer` cannot relay in reverse at all (the engine has one
  type per node) - only put those on a reverse chain's leaves.

### Node types

`normal · delay · explosive · splitter · merger · timer · moving · fake ·
reverse · bomb · multiplier` - see [`src/game/types.ts`](./src/game/types.ts)
and the renderer for glyphs.

---

## Levels

100 levels, 20 per world, difficulty ramping by **mechanic**, not by cosmetics:

1. **First Link** (1–20) - bombs, fake/hidden wiring, scrambled order, non-obvious starts, one-tap, all live immediately.
2. **Moving Links** (21–40) - drifting links, obstacles, a first merge link, reverse chains introduced.
3. **Split & Merge** (41–60) - splitters, merge links that need every real pulse, simultaneous multi-start activation.
4. **Chaos** (61–80) - hidden links, reversed chains, explosive cascades, limited taps, timers.
5. **Impossible** (81–100) - everything, layered.

Levels are **data**, compiled from compact recipes by
[`builder.ts`](./src/game/levels/builder.ts). **Adding level 101** = append one
recipe object to a world file (or a new `world6.ts`) and it appears
automatically - `TOTAL_LEVELS` and all progression/achievement math derive from
the array length.

Every level ships validated: a structural pass (reachability, no live edge into
a bomb, mergers wired) and a headless simulation that confirms all 100 are
solvable within their limits.

### Daily Challenge

`buildDailyLevel(dayNumber)` seeds a `mulberry32` PRNG from the date, so the same
day yields the same board for everyone on the same version - no server. Best
time and a daily streak are stored locally; the streak only advances once per
day and resets after a missed day.

---

## Persistence

One key (`dbtc.save.v1`) via [`src/utils/storage.ts`](./src/utils/storage.ts).
Corrupted/missing/oversized data falls back to a clean default; a `migrate()`
step keeps old saves loadable. Nothing else in the codebase touches
`localStorage` directly.

## Audio

No binary assets - a small WebAudio synth generates every sound
([`src/utils/audio.ts`](./src/utils/audio.ts)). Drop files in `public/audio/`
and register them in `SOUND_FILES` to override. Audio is unlocked on first tap;
a blocked/absent `AudioContext` is a silent no-op.

## Future-proofing

- **Monetization** - [`services/monetization.ts`](./src/services/monetization.ts)
  is a no-op boundary with the exact call sites AdMob / IAP will need
  (`maybeShowInterstitial`, `showRewardedAd`, `purchaseRemoveAds`).
- **Viral** - [`services/share.ts`](./src/services/share.ts) wraps the Web Share
  API with a clipboard fallback and a per-level share-text builder.

## License

Proprietary - © Opira Solutions.
