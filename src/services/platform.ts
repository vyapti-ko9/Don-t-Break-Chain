// Capacitor / native platform glue. All optional - the game runs identically in
// a plain browser if these plugins are absent.

let backHandler: (() => boolean) | null = null;

/** Register a handler for the Android hardware back button. Return true if handled. */
export function setBackHandler(fn: (() => boolean) | null): void {
  backHandler = fn;
}

export async function initPlatform(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');

    // AdMob works on native; web uses simulated test ads inside monetization.
    try {
      const { monetization } = await import('./monetization');
      void monetization.init();
    } catch {
      /* ads optional */
    }

    if (!Capacitor.isNativePlatform()) return;

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0b12' });
    } catch {
      /* plugin not installed */
    }

    try {
      const { App } = await import('@capacitor/app');
      void App.addListener('backButton', ({ canGoBack }) => {
        const handled = backHandler?.() ?? false;
        if (!handled && !canGoBack) void App.exitApp();
      });
    } catch {
      /* plugin not installed */
    }
  } catch {
    /* not running under Capacitor */
  }
}
