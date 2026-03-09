import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'NoGamble TTV',
    description: 'Hides gambling-promoting streamers and categories from Twitch and Kick. No setup, no account.',
    version: '0.3.6',
    homepage_url: 'https://www.nogamblettv.app',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    browser_specific_settings: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gecko: {
        id: 'nogamble-ttv@nogamblettv.app',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['none'],
          optional: [],
        },
      } as any,
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
