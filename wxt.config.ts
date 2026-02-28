import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'NoGamble',
    description: 'Hides gambling-promoting streamers from your Twitch experience.',
    version: '0.1.0',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['declarativeNetRequest'],
    host_permissions: [
      'https://www.twitch.tv/*',
      'https://usher.ttvnw.net/*',
      'https://usher.twitch.tv/*',
    ],
    declarative_net_request: {
      rule_resources: [{
        id: 'blocklist',
        enabled: true,
        path: 'rules.json',
      }],
    },
  },
  browser: 'edge',
  vite: () => ({
    server: {
      port: 3010,
    },
  }),
});
