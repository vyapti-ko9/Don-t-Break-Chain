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
| `npm run cap:sync` | `build` + copy `dist/` into the Android project |
| `npm run assets` | Regenerate launcher icons and splash images |

## Android / Capacitor

The Android project in [`android/`](./android) is checked in - it carries the
manifest, the AdMob wiring, the generated icons and the release signing setup,
so it is not disposable. Rebuild the web layer and copy it across with:

```bash
npm run cap:sync                          # build + cap sync android
cd android && ./gradlew bundleRelease     # signed .aab
cd android && ./gradlew assembleDebug     # installable .apk for a device
```

`npx cap open android` opens the same project in Android Studio.

| | |
| --- | --- |
| Package | `com.opirasolutions.dontbreakthechain` |
| min / target SDK | 24 / 36 |
| Version | `1.0.0` (versionCode 1) - bump both in `android/app/build.gradle` |
| Signing | `android/keystore.properties` -> `keystore/*.jks` (neither is in git) |

Native plugins: `@capacitor/app` (hardware back button), `@capacitor/haptics`,
`@capacitor/status-bar`, `@capacitor/splash-screen`, and
`@capacitor-community/admob`. All are optional at runtime - the game degrades
gracefully in a plain browser.

### Ads

[`services/monetization.ts`](./src/services/monetization.ts) drives an
interstitial every three cleared levels (rate limited, never on the Daily) and a
rewarded video that buys hints, behind Google's UMP consent flow. It ships with
**Google's public test ad units**; set `VITE_ADMOB_INTERSTITIAL_ID` and
`VITE_ADMOB_REWARDED_ID` (see [`.env.example`](./.env.example)) plus
`admob_app_id` in `android/app/src/main/res/values/strings.xml` to go live.

### Play Store

[`store/PLAY_LISTING.md`](./store/PLAY_LISTING.md) has every Play Console field
for the first release; [`store/privacy-policy.md`](./store/privacy-policy.md) is
ready to host. Graphics and screenshots are generated, not hand-made:

```bash
node scripts/screenshots.mjs phone tablet-7   # store/screenshots/
node scripts/store-graphics.mjs               # icon + feature graphic
```

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

Applied globally in [`data/levels.ts`](./src/data/levels.ts) on top of every
compiled level: `par` is tightened (`×0.72`), each world gets a **wrong-tap
budget** (`maxMistakes` 3→3→2→1→1) that ends the run when exceeded, and from
World 2 on every level gets a **clock** if it didn't already have one. The last
five levels of each world get an extra squeeze. Pulses travel fast and a broken
path is called within ~0.4 s. Achievements earned during a run are shown on the
result screen - no in-play overlays.

### Node types

`normal · delay · explosive · splitter · merger · timer · moving · fake ·
reverse · bomb · multiplier` - see [`src/game/types.ts`](./src/game/types.ts)
and the renderer for glyphs.

---

## Levels

100 levels, 20 per world, difficulty ramping by **mechanic**, not by cosmetics:

1. **First Link** (1–20) - tap the right link, direction, timing, first fake link, delay, one-tap.
2. **Moving Links** (21–40) - drifting links, decoy starts, obstacles, moving + delay/timer.
3. **Split & Merge** (41–60) - splitters, merge links that need every pulse, simultaneous activation.
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

- **Monetization** - AdMob interstitial and rewarded video are wired up;
  `purchaseRemoveAds` / `restorePurchases` in
  [`services/monetization.ts`](./src/services/monetization.ts) remain inert
  boundaries waiting for a billing library.
- **Viral** - [`services/share.ts`](./src/services/share.ts) wraps the Web Share
  API with a clipboard fallback and a per-level share-text builder.

## License

Proprietary - © Opira Solutions.
