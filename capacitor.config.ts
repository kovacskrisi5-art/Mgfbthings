import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glutenfreebreadclub.app',
  appName: 'GF Bread Club',
  webDir: 'out',
  server: {
    url: 'https://bakery-subscription.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
};

export default config;
