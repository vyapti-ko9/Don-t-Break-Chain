# Google Play Console — listing pack

Everything needed to fill in the Play Console for the first release of
**Don't Break the Chain** by **Opira Solutions**.

---

## 1. App identity

| Field | Value |
| --- | --- |
| App name (max 30) | `Don't Break the Chain` — 21 chars |
| Package name (**permanent**) | `com.opirasolutions.dontbreakthechain` |
| Default language | English (United States) — `en-US` |
| App or game | **Game** |
| Free or paid | **Free** (contains ads, no in-app purchases) |
| Category | **Games → Puzzle** |
| Version | `1.0.0` (versionCode `1`) |

> The package name cannot be changed after the first upload, and it cannot be
> reused even if the app is deleted. Check it before you press Create app.

---

## 2. Short description (max 80 characters)

```
One mistake and it all falls apart. 100 offline chain-reaction puzzles.
```
*71 characters.*

Alternatives if you want to A/B it later:

```
Tap the one right link and watch the chain fire. 100 puzzles, fully offline.
```
*76 characters.*

```
Find the link that starts it all. 100 handcrafted chain-reaction puzzles.
```
*73 characters.*

---

## 3. Full description (max 4000 characters)

```
One mistake. Everything falls apart.

Don't Break the Chain is a chain-reaction puzzle game about finding the single link that sets everything off. Tap the right one and energy races through the whole board. Tap the wrong one and the chain breaks.

100 HANDCRAFTED LEVELS
Five worlds, each built around a new mechanic instead of a new coat of paint:
• First Link - direction, timing, and your first fake link
• Moving Links - drifting nodes, decoy starts and obstacles
• Split & Merge - splitters that fork the energy, mergers that need every pulse
• Chaos - hidden links, reversed chains, explosive cascades, limited taps
• Impossible - everything, layered

A NEW BOARD EVERY DAY
The Daily Challenge builds the same puzzle for everyone on the same day. Beat your own best time and keep the streak alive.

HARD, NEVER UNFAIR
Every level is solvable, and every level has been verified solvable inside its own time and tap limits. Most runs allow only one mistake, so read the board before you commit. Hints are there when you are stuck.

24 ACHIEVEMENTS AND FULL STATS
Stars, perfect clears, no-mistake runs, longest chain, fastest solve, daily streak - all tracked on your device.

PLAYS FULLY OFFLINE
No account. No sign-in. No internet connection needed to play. Your progress is stored locally on your phone.

Quick to learn, hard to master, and satisfying every single time the chain fires.
```

*1,394 characters. Play strips most formatting — plain lines and bullet dots
are safe; avoid HTML.*

---

## 4. Tags (choose up to 5 from Play's fixed list)

Play only lets you pick from its own taxonomy under Games → Puzzle. Best fits:

1. **Brain Games**
2. **Logic Puzzles**
3. **Casual**
4. **Single player**
5. **Offline** *(pick "Time management" or "Arcade" if Offline is unavailable)*

---

## 5. Graphics

| Asset | Requirement | File |
| --- | --- | --- |
| App icon | 512×512 PNG, **no alpha channel** | `store/graphics/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPEG, no alpha | `store/graphics/feature-graphic.png` |
| Phone screenshots | 2–8, 1080×1920 | `store/screenshots/phone/` |
| 7-inch tablet | optional, 4–8, 1200×1920 | `store/screenshots/tablet-7/` |
| 10-inch tablet | optional | *not supplied — see note* |

**Recommended phone upload order** (the first two are what most people see):

1. `04-chain-reaction.png` — the hook: energy travelling down the chain
2. `03-gameplay-board.png` — the puzzle you are actually solving
3. `05-level-complete.png` — 3-star payoff
4. `02-level-select.png` — 100 levels, visible progress
5. `08-chain-reaction-late.png` — a harder world
6. `09-daily-challenge.png` — daily hook and streak
7. `10-achievements.png` — 24 achievements
8. `11-statistics.png` — depth for completionists

**Note on 10-inch tablets.** The game's layout caps at a 520 px column, so a
10-inch screenshot is mostly empty background. Tablet screenshots are optional;
upload the 7-inch set only, or skip tablets entirely for v1. If you want
large-screen distribution later, widen `.app-shell` in `src/index.css` first.

Regenerate any of it with:

```bash
npm run build && node scripts/screenshots.mjs phone tablet-7 && node scripts/store-graphics.mjs
```

---

## 6. Contact details (store listing)

| Field | Value |
| --- | --- |
| Email | *your support address at opirasolutions* |
| Website | optional but recommended |
| Phone | optional |
| Privacy policy URL | **required** — see §9 |

---

## 7. Content rating (IARC questionnaire)

Category: **Game → Puzzle / Casual**. Answer everything "No" except where noted:

| Question | Answer |
| --- | --- |
| Violence, blood, sexual content, nudity | No |
| Profanity, crude humour | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling, simulated gambling | No |
| Horror or fear themes | No |
| **Does the app contain ads?** | **Yes** |
| Does the app share the user's location? | No |
| Does the app allow users to interact or exchange information? | No |
| Does the app allow the purchase of digital goods? | No |
| Does the app contain user-generated content? | No |

Expected outcome: **Everyone / PEGI 3 / ESRB E**.

---

## 8. App content declarations

| Section | Answer |
| --- | --- |
| **Privacy policy** | URL required (ads = data collection) |
| **App access** | All functionality is available without restrictions — no login |
| **Ads** | **Yes, my app contains ads** |
| **Content rating** | complete the questionnaire in §7 |
| **Target audience** | **13+** (see note) |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | see §10 |
| **Government app** | No |
| **Financial features** | None |
| **Health apps** | No |
| **Advertising ID** | Yes — used by the Google Mobile Ads SDK |

**Why 13+.** Including under-13 puts the app under the Designed for Families
programme: certified ad SDKs only, no interest-based ads, and extra review.
The build already sets `tagForChildDirectedTreatment: false` and requests
`General` ad content, which lines up with a 13+ audience. If you *do* want
under-13, that flag has to change in `src/services/monetization.ts` first.

---

## 9. Privacy policy

A ready-to-publish policy is in [`store/privacy-policy.md`](./privacy-policy.md).
Host it anywhere with a public HTTPS URL (GitHub Pages, your own site, Notion
public page) and paste that URL into the Play Console. Play rejects listings
whose policy URL 404s or redirects to a homepage.

---

## 10. Data safety form

The game itself stores nothing off-device. The Google Mobile Ads SDK is what
gets declared.

**Does your app collect or share any of the required user data types?** → **Yes**

| Data type | Collected | Shared | Purpose | Required? | User-linked? |
| --- | --- | --- | --- | --- | --- |
| Device or other IDs → **Advertising ID** | Yes | Yes | Advertising or marketing; Fraud prevention, security and compliance | Required | Not linked to identity |

Also declare, if you keep the default AdMob behaviour:

| Data type | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| App activity → **App interactions** | Yes | Yes | Advertising or marketing; Analytics |

Security section:

- **Is all user data encrypted in transit?** Yes
- **Do you provide a way for users to request data deletion?** No — the app
  keeps no account and no server-side data; uninstalling removes everything
  local. Point users at Google's advertising-ID reset control in the policy.

Everything the game itself saves — progress, stars, streaks, settings — lives in
the app's own local storage and never leaves the device, so it is **not**
declared as collected.

---

## 11. Pricing and distribution

| Field | Value |
| --- | --- |
| Price | Free (cannot be changed to paid later) |
| Countries | All (or select your launch markets) |
| Contains ads | Yes |
| In-app purchases | No |
| Google Play for Education / Families | No |
| Ads and content ratings consistent | Yes |

---

## 12. Release

| Field | Value |
| --- | --- |
| Track | **Internal testing** first, then Closed → Production |
| App bundle | `release/dont-break-the-chain-v1.0.0-vc1.aab` |
| Release name | `1.0.0 (1)` |
| Signing | Let Google Play sign — upload key is `keystore/dontbreakthechain-upload.jks` |

Release notes (max 500 characters):

```
First release.

• 100 handcrafted levels across five worlds
• A new Daily Challenge every day, same board for everyone
• 24 achievements, stars, streaks and detailed stats
• Plays fully offline - no account, no sign-in
```

---

## 13. Before you flip to Production ⚠️

The build ships **Google's public AdMob test ad units**. They always fill, they
are safe to tap, and they earn **nothing** — real users would see creatives
labelled "Test Ad". That is fine for internal and closed testing; swap them
before a public launch:

1. Create the app and two ad units (interstitial + rewarded) at
   [apps.admob.com](https://apps.admob.com).
2. Replace `admob_app_id` in
   `android/app/src/main/res/values/strings.xml` with the real
   `ca-app-pub-…~…` app ID.
3. Copy `.env.example` to `.env.production` and set
   `VITE_ADMOB_INTERSTITIAL_ID` and `VITE_ADMOB_REWARDED_ID`.
4. Bump `versionCode` in `android/app/build.gradle`, then
   `npm run cap:sync && cd android && ./gradlew bundleRelease`.

`USING_TEST_ADS` in `src/services/monetization.ts` flips itself off as soon as
both unit IDs are real, which turns off `isTesting` on every request.

The AdMob app ID in the manifest and the unit IDs must come from the **same**
AdMob account, or the SDK throws on launch.
