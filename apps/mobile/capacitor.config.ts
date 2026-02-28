import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.joubuild.app',
  appName: 'JouBuild',
  webDir: 'www',
  server: {
    url: 'https://buildex-eight.vercel.app',
    cleartext: false,
  },
  ios: {
    scheme: 'JouBuild',
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#171717',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      launchFadeOutDuration: 300,
      backgroundColor: '#171717',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#171717',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
    },
  },
};

export default config;
