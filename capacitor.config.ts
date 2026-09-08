import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.opirasolutions.dontbreakthechain',
  appName: "Don't Break the Chain",
  webDir: 'dist',
  backgroundColor: '#0a0b12',
  android: {
    backgroundColor: '#0a0b12',
    // Android 15+ forces edge-to-edge; 'auto' lets Capacitor inset the WebView
    // so the HUD is never hidden behind the status / gesture bars.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0a0b12',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
