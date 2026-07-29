export default defineBackground(() => {
  const BASE_URL = 'https://www.nogamblettv.app/api';

  // Client cache TTL is server-tunable: the API sends `x-client-ttl` (seconds)
  // so refresh cadence can be changed without shipping a new extension version.
  const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
  const MIN_TTL_MS = 5 * 60 * 1000;
  const MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  interface ListConfig {
    endpoint: string;
    dataKey: string;
    tsKey: string;
    ttlKey: string;
  }

  // Storage keys predate this refactor — existing users' caches carry over.
  const LISTS: Record<string, ListConfig> = {
    GET_BLACKLIST: {
      endpoint: '/blacklist',
      dataKey: 'blacklist',
      tsKey: 'blacklistTs',
      ttlKey: 'blacklistTtl',
    },
    GET_KICK_BLACKLIST: {
      endpoint: '/kicklist',
      dataKey: 'kickBlacklist',
      tsKey: 'kickBlacklistTs',
      ttlKey: 'kickBlacklistTtl',
    },
    GET_CATEGORIES: {
      endpoint: '/categories',
      dataKey: 'categories',
      tsKey: 'categoriesTs',
      ttlKey: 'categoriesTtl',
    },
    GET_KICK_CATEGORIES: {
      endpoint: '/categories/kick',
      dataKey: 'kickCategories',
      tsKey: 'kickCategoriesTs',
      ttlKey: 'kickCategoriesTtl',
    },
  };

  function parseServerTtl(res: Response): number {
    const seconds = Number(res.headers.get('x-client-ttl'));
    if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_TTL_MS;
    return Math.min(Math.max(seconds * 1000, MIN_TTL_MS), MAX_TTL_MS);
  }

  // One network refresh per list at a time — concurrent callers share it.
  const inflight = new Map<string, Promise<unknown[]>>();

  function refresh(cfg: ListConfig): Promise<unknown[]> {
    const existing = inflight.get(cfg.endpoint);
    if (existing) return existing;
    const request = (async () => {
      const res = await fetch(`${BASE_URL}${cfg.endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as unknown[];
      if (!Array.isArray(list)) throw new Error('Unexpected response shape');
      await browser.storage.local.set({
        [cfg.dataKey]: list,
        [cfg.tsKey]: Date.now(),
        [cfg.ttlKey]: parseServerTtl(res),
      });
      return list;
    })();
    inflight.set(cfg.endpoint, request);
    return request.finally(() => inflight.delete(cfg.endpoint));
  }

  // Stale-while-revalidate: always answer from cache when one exists, kicking
  // off a background refresh once it is older than the TTL. Only block on the
  // network when there is no cache at all (first run after install).
  async function getList(cfg: ListConfig): Promise<unknown[]> {
    const stored = await browser.storage.local.get([cfg.dataKey, cfg.tsKey, cfg.ttlKey]);
    const cached = Array.isArray(stored[cfg.dataKey]) ? (stored[cfg.dataKey] as unknown[]) : null;
    if (cached) {
      const fetchedAt = typeof stored[cfg.tsKey] === 'number' ? (stored[cfg.tsKey] as number) : 0;
      const ttl = typeof stored[cfg.ttlKey] === 'number' ? (stored[cfg.ttlKey] as number) : DEFAULT_TTL_MS;
      if (Date.now() - fetchedAt >= ttl) {
        refresh(cfg).catch(() => {
          // Network failed — keep serving the stale copy until the next attempt.
        });
      }
      return cached;
    }
    try {
      return await refresh(cfg);
    } catch {
      return [];
    }
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const cfg = typeof message?.type === 'string' ? LISTS[message.type] : undefined;
    if (!cfg) return false;
    getList(cfg).then(sendResponse);
    return true;
  });

  // Pre-warm all caches on service worker start
  for (const cfg of Object.values(LISTS)) {
    void getList(cfg);
  }
});
