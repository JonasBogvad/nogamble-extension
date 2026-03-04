import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'NoGamble TTV',
    description: 'Hides gambling-promoting streamers and categories from Twitch and Kick. No setup, no account.',
    version: '0.3.0',
    homepage_url: 'https://www.nogamblettv.app',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['storage'],
    host_permissions: [
      'https://www.twitch.tv/*',
      'https://kick.com/*',
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
