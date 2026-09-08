// ---------------------------------------------------------------------------
// Monetization — AdMob interstitial + rewarded video on native, and a simulated
// flow in the browser so the same call sites stay testable during development.
//
// Ships with Google's public TEST ad units: they always serve test creatives,
// never earn revenue, and are safe to tap. Point the VITE_ADMOB_* variables at
// the real unit IDs (see .env.example) to go live — no code change needed.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core';

type AdMobModule = typeof import('@capacitor-community/admob');

export interface RewardedAdResult {
  rewarded: boolean;
}

/** Google's sample units — https://developers.google.com/admob/android/test-ads */
export const ADMOB_TEST_IDS = {
  appIdAndroid: 'ca-app-pub-3940256099942544~3347511713',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  banner: 'ca-app-pub-3940256099942544/6300978111',
} as const;

const AD_UNITS = {
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || ADMOB_TEST_IDS.interstitial,
  rewarded: import.meta.env.VITE_ADMOB_REWARDED_ID || ADMOB_TEST_IDS.rewarded,
};

/** True while either unit is still a Google sample ID — drives `isTesting`. */
export const USING_TEST_ADS =
  AD_UNITS.interstitial === ADMOB_TEST_IDS.interstitial ||
  AD_UNITS.rewarded === ADMOB_TEST_IDS.rewarded;

/** Exposed for AndroidManifest / docs. */
export const ADMOB_TEST_APP_ID = ADMOB_TEST_IDS.appIdAndroid;

const INTERSTITIAL_EVERY = 3; // cleared levels between interstitials
const INTERSTITIAL_COOLDOWN_MS = 90_000; // never two inside 90 s
const FIRST_AD_AFTER_LEVEL = 3; // let players settle in first
const REWARD_TIMEOUT_MS = 180_000; // never leave the hint button spinning

class MonetizationService {
  private _adsRemoved = false;
  private _canRequestAds = true;
  /** Non-personalised ads — set when consent is required or unavailable. */
  private _npa = false;
  private _clearsSinceAd = 0;
  private _lastInterstitialAt = 0;
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;
  private _initPromise: Promise<void> | null = null;
  private _simOverlay: HTMLDivElement | null = null;

  get adsRemoved(): boolean {
    return this._adsRemoved;
  }

  private get native(): boolean {
    return Capacitor.isNativePlatform();
  }

  private plugin(): Promise<AdMobModule> {
    return import('@capacitor-community/admob');
  }

  // -- lifecycle ------------------------------------------------------------

  /** Idempotent: every entry point awaits this before touching the SDK. */
  async init(): Promise<void> {
    if (this._adsRemoved) return;
    if (!this._initPromise) this._initPromise = this.doInit();
    return this._initPromise;
  }

  private async doInit(): Promise<void> {
    if (!this.native) return;
    try {
      const mod = await this.plugin();
      await mod.AdMob.initialize({
        initializeForTesting: USING_TEST_ADS,
        // The game is rated for everyone; keep the ad inventory in step.
        maxAdContentRating: mod.MaxAdContentRating.General,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await this.resolveConsent(mod);
      void this.preload();
    } catch (err) {
      // A missing or failing ad SDK must never take the game down.
      console.warn('[ads] init failed', err);
    }
  }

  /**
   * Google UMP. Required before serving ads to EEA/UK users, a no-op elsewhere.
   * Any failure falls back to non-personalised ads rather than blocking play.
   */
  private async resolveConsent(mod: AdMobModule): Promise<void> {
    try {
      let info = await mod.AdMob.requestConsentInfo();
      if (info.status === mod.AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        info = await mod.AdMob.showConsentForm();
      }
      this._canRequestAds = info.canRequestAds !== false;
      this._npa = info.status !== mod.AdmobConsentStatus.OBTAINED;
    } catch (err) {
      console.warn('[ads] consent unavailable — requesting non-personalised ads', err);
      this._npa = true;
    }
  }

  /** Warm both formats so a show is instant. Safe to call repeatedly. */
  private async preload(): Promise<void> {
    if (!this.native || !this._canRequestAds || this._adsRemoved) return;
    const { AdMob } = await this.plugin();
    const opts = { isTesting: USING_TEST_ADS, npa: this._npa };

    if (!this._interstitialLoaded) {
      try {
        await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, ...opts });
        this._interstitialLoaded = true;
      } catch (err) {
        console.warn('[ads] interstitial preload failed', err);
      }
    }

    if (!this._rewardedLoaded) {
      try {
        await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, ...opts });
        this._rewardedLoaded = true;
      } catch (err) {
        console.warn('[ads] rewarded preload failed', err);
      }
    }
  }

  // -- interstitial ---------------------------------------------------------

  /** After a win — an interstitial every few cleared levels, rate limited. */
  async maybeShowInterstitial(context: { levelId: number; attempts: number }): Promise<void> {
    if (this._adsRemoved || !this._canRequestAds) return;
    // Daily-challenge ids live above 9000 and stay ad-free.
    if (context.levelId < FIRST_AD_AFTER_LEVEL || context.levelId >= 9000) return;

    this._clearsSinceAd += 1;
    if (this._clearsSinceAd < INTERSTITIAL_EVERY) return;
    if (Date.now() - this._lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;

    await this.init();

    if (!this.native) {
      this._clearsSinceAd = 0;
      this._lastInterstitialAt = Date.now();
      await this.simulateAd('Interstitial (test)', 1800);
      return;
    }

    try {
      const { AdMob } = await this.plugin();
      if (!this._interstitialLoaded) await this.preload();
      if (!this._interstitialLoaded) return; // no fill — keep the counter, retry later

      await AdMob.showInterstitial();
      this._clearsSinceAd = 0;
      this._lastInterstitialAt = Date.now();
      this._interstitialLoaded = false;
      void this.preload(); // line up the next one
    } catch (err) {
      console.warn('[ads] interstitial failed', err);
      this._interstitialLoaded = false;
      void this.preload();
    }
  }

  // -- rewarded -------------------------------------------------------------

  /**
   * Rewarded video for extra hints. Reports `rewarded: true` only once the SDK
   * says the reward was earned — except when the ad cannot be shown at all,
   * where the hints are granted anyway: this is a fully offline game and
   * punishing a player for a dead network would be worse than a free hint.
   */
  async showRewardedAd(_placement: 'extra-hint' | 'continue'): Promise<RewardedAdResult> {
    if (this._adsRemoved) return { rewarded: true };
    await this.init();

    if (!this.native) {
      const watched = await this.simulateAd('Watch ad · earn hints', 2500, true);
      return { rewarded: watched };
    }

    const { AdMob, RewardAdPluginEvents } = await this.plugin();
    if (!this._rewardedLoaded) await this.preload();
    if (!this._rewardedLoaded) return { rewarded: true }; // no fill — fail open

    let earned = false;
    let settle: (value: boolean) => void = () => undefined;
    const settled = new Promise<boolean>((resolve) => {
      settle = resolve;
    });

    const handles = await Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earned = true;
      }),
      // Dismissed fires after a completed view too, so settle on what was
      // actually earned rather than assuming a skip.
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => settle(earned)),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => settle(true)),
    ]);

    let timer = 0;
    try {
      void AdMob.showRewardVideoAd()
        .then(() => {
          earned = true;
        })
        .catch((err) => {
          console.warn('[ads] rewarded show failed', err);
          settle(true);
        });

      const rewarded = await Promise.race([
        settled,
        new Promise<boolean>((resolve) => {
          timer = window.setTimeout(() => resolve(earned), REWARD_TIMEOUT_MS);
        }),
      ]);
      return { rewarded };
    } finally {
      window.clearTimeout(timer);
      this._rewardedLoaded = false;
      await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
      void this.preload();
    }
  }

  // -- IAP boundary (no store wired up yet) ---------------------------------

  async purchaseRemoveAds(): Promise<boolean> {
    this._adsRemoved = true;
    return true;
  }

  async restorePurchases(): Promise<void> {
    return;
  }

  // -- browser fallback -----------------------------------------------------

  /** In-browser mock ad so the flow is testable without the native SDK. */
  private simulateAd(title: string, ms: number, cancellable = false): Promise<boolean> {
    return new Promise((resolve) => {
      this._simOverlay?.remove();
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.82);padding:24px;font-family:system-ui,sans-serif;';
      overlay.innerHTML = `
        <div style="width:100%;max-width:320px;border-radius:20px;border:1px solid #2a2e44;background:#12141f;padding:22px;text-align:center;color:#f2f3f8;">
          <div style="font-size:28px;margin-bottom:8px;">📺</div>
          <div style="font-weight:800;font-size:18px;margin-bottom:6px;">AdMob Test Ad</div>
          <div style="font-size:13px;color:#8b90a8;margin-bottom:16px;">${title}</div>
          <div class="bar" style="height:6px;border-radius:99px;background:#1b1e2e;overflow:hidden;margin-bottom:14px;">
            <div class="fill" style="height:100%;width:0%;background:linear-gradient(90deg,#5b8cff,#00e6c3);transition:width linear;"></div>
          </div>
          <div class="status" style="font-size:12px;color:#8b90a8;">Loading test creative…</div>
          ${
            cancellable
              ? '<button type="button" data-cancel style="margin-top:14px;width:100%;padding:10px;border-radius:12px;border:1px solid #2a2e44;background:#1b1e2e;color:#fff;font-weight:700;cursor:pointer;">Cancel</button>'
              : ''
          }
        </div>`;
      document.body.appendChild(overlay);
      this._simOverlay = overlay;

      const fill = overlay.querySelector('.fill') as HTMLDivElement;
      const status = overlay.querySelector('.status') as HTMLDivElement;
      requestAnimationFrame(() => {
        fill.style.transitionDuration = `${ms}ms`;
        fill.style.width = '100%';
      });

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        overlay.remove();
        if (this._simOverlay === overlay) this._simOverlay = null;
        resolve(ok);
      };

      overlay.querySelector('[data-cancel]')?.addEventListener('click', () => finish(false));

      window.setTimeout(() => {
        status.textContent = 'Reward granted';
        window.setTimeout(() => finish(true), 280);
      }, ms);
    });
  }
}

export const monetization = new MonetizationService();
