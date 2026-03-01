export default defineBackground(() => {
  const BASE_URL = 'https://www.nogamblettv.app/api';
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  async function fetchBlacklist(): Promise<string[]> {
    const cached = await chrome.storage.local.get(['blacklist', 'blacklistTs']);
    const now = Date.now();
    if (
      Array.isArray(cached.blacklist) &&
      typeof cached.blacklistTs === 'number' &&
      now - cached.blacklistTs < CACHE_TTL_MS
    ) {
      return cached.blacklist as string[];
    }
    try {
      const res = await fetch(`${BASE_URL}/blacklist`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as string[];
      await chrome.storage.local.set({ blacklist: list, blacklistTs: now });
      return list;
    } catch {
      return Array.isArray(cached.blacklist) ? (cached.blacklist as string[]) : [];
    }
  }

  async function fetchCategories(): Promise<{ slug: string; name: string }[]> {
    const cached = await chrome.storage.local.get(['categories', 'categoriesTs']);
    const now = Date.now();
    if (
      Array.isArray(cached.categories) &&
      typeof cached.categoriesTs === 'number' &&
      now - cached.categoriesTs < CACHE_TTL_MS
    ) {
      return cached.categories as { slug: string; name: string }[];
    }
    try {
      const res = await fetch(`${BASE_URL}/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as { slug: string; name: string }[];
      await chrome.storage.local.set({ categories: list, categoriesTs: now });
      return list;
    } catch {
      return Array.isArray(cached.categories)
        ? (cached.categories as { slug: string; name: string }[])
        : [];
    }
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'GET_BLACKLIST') {
      fetchBlacklist().then(sendResponse);
      return true;
    }
    if (message?.type === 'GET_CATEGORIES') {
      fetchCategories().then(sendResponse);
      return true;
    }
    return false;
  });

  // Pre-warm both caches on service worker start
  fetchBlacklist();
  fetchCategories();
});
