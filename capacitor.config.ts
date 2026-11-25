import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.hossein.sillon',
  appName: 'Sillon',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
