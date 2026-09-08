import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tdgdesign.dontbreakthechain',
  appName: "Don't Break the Chain",
  webDir: 'dist',
  backgroundColor: '#0a0b12',
  android: {
    backgroundColor: '#0a0b12',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0a0b12',
      showSpinner: false,
    },
  },
};

export default config;
