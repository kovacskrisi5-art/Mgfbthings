import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glutenfreesaveclub.app',
  appName: 'GF Save Club',
  webDir: 'out',
  server: {
    // Replace with your live domain after deploying to Vercel
    url: 'https://glutenfreesaveclub.co.uk',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
};

export default config;
