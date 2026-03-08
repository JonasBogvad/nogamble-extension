import { LOCALES, REGISTRIES, detectLocaleAndRegistry } from '../utils/i18n';
import { extractChannel, hideElement } from '../utils/dom';
import { injectOverlay, removeOverlay } from '../utils/overlay';
import { injectWidget, removeWidget } from '../utils/widget';

export default defineContentScript({
  matches: ['https://www.twitch.tv/*'],
  runAt: 'document_idle',
  async main() {
    // ─── Remote blacklist ──────────────────────────────────────────────────────
    let rawList: string[] = [];
    try {
      rawList = (await browser.runtime.sendMessage({ type: 'GET_BLACKLIST' })) as string[];
    } catch {
      rawList = [];
    }
    const BLACKLIST = new Set(rawList.map((n) => n.toLowerCase()));

    // ─── Remote categories ─────────────────────────────────────────────────────
    let rawCategories: { slug: string; name: string }[] = [];
    try {
      rawCategories = (await browser.runtime.sendMessage({ type: 'GET_CATEGORIES' })) as {
        slug: string;
        name: string;
      }[];
    } catch {
      rawCategories = [];
    }
    const BLOCKED_CATEGORIES = new Map<string, string>(
      rawCategories.map(({ slug, name }) => [slug.toLowerCase(), name])
    );

    // ─── Locale + registry detection ───────────────────────────────────────────
    const { locale, registry } = detectLocaleAndRegistry();
    const tx = LOCALES[locale];
    const reg = registry ? REGISTRIES[registry] : null;

    // ─── Twitch-specific utilities ─────────────────────────────────────────────

    /** Extract gambling category slug from "/directory/category/slots" */
    function extractCategory(href: string): string | null {
      const match = href.match(/^\/directory\/category\/([^/?]+)/i);
      return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null;
    }

    /**
     * Walk up from a sidebar link to find the individual channel row.
     */
    function findSidebarRow(link: HTMLAnchorElement): HTMLElement {
      let el: HTMLElement = link;
      while (el.parentElement) {
        const parent = el.parentElement;
        const uniqueChannels = new Set<string>();
        for (const a of parent.querySelectorAll<HTMLAnchorElement>('a[href]')) {
          const ch = extractChannel(a.getAttribute('href') ?? '');
          if (ch) uniqueChannels.add(ch);
        }
        if (uniqueChannels.size > 1) return el;
        if (['nav', 'aside', 'main', 'body'].includes(parent.tagName.toLowerCase())) return el;
        el = parent;
      }
      return el;
    }

    /**
     * Walk up from a stream card link to find the card container.
     */
    function findCardContainer(link: HTMLAnchorElement): HTMLElement {
      const cardContainer = link.closest<HTMLElement>('[data-target="directory-game__card_container"]');
      if (cardContainer?.parentElement) return cardContainer.parentElement as HTMLElement;
      // Walk up from article to find the flex grid cell (identified by inline `style="order: X"`)
      const article = link.closest('article');
      if (article) {
        let el: HTMLElement = article;
        while (el.parentElement) {
          const parent = el.parentElement as HTMLElement;
          if (/(^|;)\s*order\s*:/.test(parent.getAttribute('style') ?? '')) return parent;
          if (['main', 'section', 'ul', 'ol', 'body'].includes(parent.tagName.toLowerCase())) return el;
          el = parent;
        }
        return el;
      }
      return (link.parentElement as HTMLElement) ?? link;
    }

    // ─── Twitch widget positioning ─────────────────────────────────────────────

    const isSidebarCollapsed = (): boolean =>
      document.querySelector('.side-nav--collapsed') !== null;

    const isTheatreMode = (): boolean =>
      document.querySelector('[data-a-player-state="theatre"]') !== null;

    const isFullscreen = (): boolean => !!document.fullscreenElement;

    function getTwitchWidgetPosition(): { top: string; left: string } {
      if (isFullscreen() || isTheatreMode()) {
        return { top: '46px', left: '16px' };
      } else if (isSidebarCollapsed()) {
        return { top: '120px', left: '60px' };
      } else {
        const section = document.querySelector<HTMLElement>('.side-nav-section');
        const nav = section?.closest<HTMLElement>('aside, nav') ?? section?.parentElement ?? null;
        const navWidth = nav ? nav.getBoundingClientRect().width : 240;
        return { top: '120px', left: `${navWidth + 24}px` };
      }
    }

    // ─── Channel page overlay + widget ────────────────────────────────────────

    function getChannelFromUrl(): string | null {
      return extractChannel(window.location.pathname);
    }

    function reinjectTwitchWidget(): void {
      const ch = getChannelFromUrl();
      if (ch && BLACKLIST.has(ch)) {
        injectWidget(reg!, tx, getTwitchWidgetPosition, reinjectTwitchWidget);
      }
    }

    function checkChannelPage(): void {
      const channel = getChannelFromUrl();
      const categorySlug = extractCategory(window.location.pathname);
      const categoryName = categorySlug ? BLOCKED_CATEGORIES.get(categorySlug) : undefined;

      if (channel && BLACKLIST.has(channel)) {
        const tryInject = () => {
          if (document.body) {
            injectOverlay(channel, tx);
            if (reg) injectWidget(reg, tx, getTwitchWidgetPosition, reinjectTwitchWidget);
          } else {
            requestAnimationFrame(tryInject);
          }
        };
        tryInject();
      } else if (categoryName) {
        const tryInject = () => {
          if (document.body) {
            injectOverlay(categoryName, tx, true);
            // No widget on category pages — only on live streams
          } else {
            requestAnimationFrame(tryInject);
          }
        };
        tryInject();
      } else {
        removeOverlay();
      }
    }

    // ─── Stream category check ─────────────────────────────────────────────────

    function checkStreamCategory(): void {
      const channel = getChannelFromUrl();

      if (!channel) { removeWidget(); return; }
      if (BLACKLIST.has(channel)) return;
      if (BLOCKED_CATEGORIES.has(extractCategory(window.location.pathname) ?? '')) return;

      const gameLink = document.querySelector<HTMLAnchorElement>('[data-a-target="stream-game-link"]');
      const streamSlug = gameLink ? extractCategory(gameLink.getAttribute('href') ?? '') : null;

      if (streamSlug && BLOCKED_CATEGORIES.has(streamSlug)) {
        if (reg) injectWidget(reg, tx, getTwitchWidgetPosition, reinjectTwitchWidget,
          `https://www.nogamblettv.app/?u=${encodeURIComponent(channel)}&p=twitch#tip`);
      } else {
        removeWidget();
      }
    }

    // ─── Category tile hiding ──────────────────────────────────────────────────

    const processedCategoryLinks = new WeakSet<HTMLAnchorElement>();

    function scanCategories(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        '[data-a-target="tw-box-art-card-link"]'
      );
      for (const link of links) {
        if (processedCategoryLinks.has(link)) continue;
        processedCategoryLinks.add(link);

        const slug = extractCategory(link.getAttribute('href') ?? '');
        if (!slug || !BLOCKED_CATEGORIES.has(slug)) continue;

        const cardContainer = link.closest<HTMLElement>('[data-target="directory-page__card-container"]');
        hideElement(cardContainer?.parentElement ?? (link.parentElement as HTMLElement) ?? link);
      }
    }

    // ─── Sidebar hiding ────────────────────────────────────────────────────────

    const processedSidebarLinks = new WeakSet<HTMLAnchorElement>();

    function scanSidebar(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        '.side-nav-section a[href]'
      );
      for (const link of links) {
        if (processedSidebarLinks.has(link)) continue;
        processedSidebarLinks.add(link);

        const channel = extractChannel(link.getAttribute('href') ?? '');
        if (!channel || !BLACKLIST.has(channel)) continue;

        hideElement(findSidebarRow(link));
      }
    }

    // ─── Stream card hiding ────────────────────────────────────────────────────

    const processedCardLinks = new WeakSet<HTMLAnchorElement>();

    function scanCards(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        '[data-a-target="preview-card-channel-link"], [data-a-target="preview-card-title-link"], [data-a-target="preview-card-image-link"]'
      );
      for (const link of links) {
        if (processedCardLinks.has(link)) continue;
        processedCardLinks.add(link);

        const channel = extractChannel(link.getAttribute('href') ?? '');
        if (!channel || !BLACKLIST.has(channel)) continue;

        hideElement(findCardContainer(link));
      }
    }

    function scanAndHide(): void {
      scanSidebar();
      scanCards();
      scanCategories();
      checkStreamCategory();
    }

    // ─── SPA navigation detection ──────────────────────────────────────────────

    let lastUrl = window.location.href;

    function onNavigate(): void {
      const newUrl = window.location.href;
      if (newUrl === lastUrl) return;
      lastUrl = newUrl;

      removeOverlay();
      checkChannelPage();

      setTimeout(scanAndHide, 500);
      setTimeout(scanAndHide, 1500);
    }

    setInterval(onNavigate, 300);
    window.addEventListener('popstate', onNavigate);

    // ─── MutationObserver ──────────────────────────────────────────────────────

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndHide, 150);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ─── Initial run ───────────────────────────────────────────────────────────

    checkChannelPage();
    scanAndHide();
    setTimeout(scanAndHide, 1000);
    setTimeout(scanAndHide, 3000);
  },
});

