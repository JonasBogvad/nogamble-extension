import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'NoGamble TTV',
    description: 'Hides gambling-promoting streamers from your Twitch experience.',
    version: '0.1.0',
    homepage_url: 'https://www.nogamblettv.app',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['storage'],
    host_permissions: [
      'https://www.twitch.tv/*',
      'https://www.nogamblettv.app/*',
    ],
  },
  browser: 'chrome',
  vite: () => ({
    server: {
      port: 3010,
    },
  }),
});
