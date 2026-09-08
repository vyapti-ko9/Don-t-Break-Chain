// ---------------------------------------------------------------------------
// Monetization — AdMob test ads on native; simulated rewarded flow on web.
// Interstitials every N completed levels. Rewarded video unlocks a hint.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core';

export interface RewardedAdResult {
  rewarded: boolean;
}

/** Google sample / test unit IDs — safe for development only. */
const TEST = {
  appIdAndroid: 'ca-app-pub-3940256099942544~3347511713',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

const INTERSTITIAL_EVERY = 3; // show after every 3rd cleared level

class MonetizationService {
  private _adsRemoved = false;
  private _ready = false;
  private _clearsSinceAd = 0;
  private _simOverlay: HTMLDivElement | null = null;

  get adsRemoved(): boolean {
    return this._adsRemoved;
  }

  async init(): Promise<void> {
    if (this._ready || this._adsRemoved) return;
    if (!Capacitor.isNativePlatform()) {
      this._ready = true;
      return;
    }
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({
        initializeForTesting: true,
      });
      this._ready = true;
    } catch (err) {
      console.warn('[ads] AdMob init failed', err);
      this._ready = true;
    }
  }

  /** After a win — interstitial every few levels. */
  async maybeShowInterstitial(context: { levelId: number; attempts: number }): Promise<void> {
    if (this._adsRemoved) return;
    await this.init();

    if (context.levelId < 3 || context.levelId >= 9000) return;

    this._clearsSinceAd += 1;
    if (this._clearsSinceAd < INTERSTITIAL_EVERY) return;
    this._clearsSinceAd = 0;

    if (!Capacitor.isNativePlatform()) {
      await this.simulateAd('Interstitial (test)', 1800);
      return;
    }

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({
        adId: TEST.interstitial,
        isTesting: true,
      });
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn('[ads] interstitial failed', err);
      await this.simulateAd('Interstitial (test)', 1600);
    }
  }

  /** Rewarded ad for unlocking a hint. Always grants on successful watch. */
  async showRewardedAd(_placement: 'extra-hint' | 'continue'): Promise<RewardedAdResult> {
    if (this._adsRemoved) return { rewarded: true };
    await this.init();

    if (!Capacitor.isNativePlatform()) {
      const watched = await this.simulateAd(`Watch ad · earn ${2} hints`, 2500, true);
      return { rewarded: watched };
    }

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareRewardVideoAd({
        adId: TEST.rewarded,
        isTesting: true,
      });
      await AdMob.showRewardVideoAd();
      return { rewarded: true };
    } catch (err) {
      console.warn('[ads] rewarded failed', err);
      const watched = await this.simulateAd('Watch ad · earn 2 hints', 2200, true);
      return { rewarded: watched };
    }
  }

  async purchaseRemoveAds(): Promise<boolean> {
    this._adsRemoved = true;
    return true;
  }

  async restorePurchases(): Promise<void> {
    return;
  }

  /** In-browser / fallback mock ad so flow is testable without native SDK. */
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

/** Exposed for AndroidManifest / docs. */
export const ADMOB_TEST_APP_ID = TEST.appIdAndroid;
