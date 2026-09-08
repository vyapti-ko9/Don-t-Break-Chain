/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Real AdMob interstitial unit id. Falls back to Google's test unit. */
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string;
  /** Real AdMob rewarded unit id. Falls back to Google's test unit. */
  readonly VITE_ADMOB_REWARDED_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
