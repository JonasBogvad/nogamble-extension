import { LOCALES, REGISTRIES, detectLocaleAndRegistry } from '../utils/i18n';
import { extractChannel, hideElement } from '../utils/dom';
import { injectOverlay, removeOverlay } from '../utils/overlay';
import { injectWidget, removeWidget } from '../utils/widget';

export default defineContentScript({
  matches: ['https://kick.com/*'],
  runAt: 'document_idle',
  async main() {
    // ─── Remote Kick blacklist ─────────────────────────────────────────────────
    let rawKickList: string[] = [];
    try {
      rawKickList = (await browser.runtime.sendMessage({ type: 'GET_KICK_BLACKLIST' })) as string[];
    } catch {
      rawKickList = [];
    }
    const KICK_BLACKLIST = new Set(rawKickList.map((n) => n.toLowerCase()));

    // ─── Remote Kick categories ────────────────────────────────────────────────
    let rawCategories: { slug: string; name: string }[] = [];
    try {
      rawCategories = (await browser.runtime.sendMessage({ type: 'GET_KICK_CATEGORIES' })) as {
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

    // ─── Kick-specific utilities ───────────────────────────────────────────────

    // Kick paths that are not channel names
    const KICK_RESERVED_PATHS = new Set([
      'browse', 'categories', 'category', 'search', 'following', 'dashboard',
      'studio', 'messages', 'subscriptions', 'clips', 'squad', 'events',
      'leaderboard', 'help', 'about', 'terms', 'privacy',
    ]);

    /** Extract category slug from a Kick href like "/category/slots" */
    function extractKickCategory(href: string): string | null {
      const match = href.match(/^\/category\/([^/?]+)/i);
      return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null;
    }

    // ─── Kick widget positioning ───────────────────────────────────────────────
    // Sidebar expanded = 256px, collapsed = 56px (icon bar).
    // Navbar height = 60px (--navbar-height CSS var).
    // Theatre mode: `data-theatre="true"` on the group/main wrapper; sidebar hidden when active.
    // Fullscreen: handled via fullscreenchange event inside injectWidget.

    function getKickPosition(): { top: string; left: string } {
      // Theatre mode — sidebar is hidden; widget sits just left of stream content
      const theatreEl = document.querySelector('[data-theatre="true"]');
      if (theatreEl) return { top: '80px', left: '16px' };

      // Sidebar state: data-testid="sidebar-collapse" exists → sidebar is expanded
      const expandedBtn = document.querySelector('[data-testid="sidebar-collapse"]');
      const leftOffset = expandedBtn ? 256 + 16 : 56 + 16;
      return { top: '80px', left: `${leftOffset}px` };
    }

    // ─── Channel page overlay + widget ────────────────────────────────────────

    function getKickChannelFromUrl(): string | null {
      return extractChannel(window.location.pathname, KICK_RESERVED_PATHS);
    }

    function reinjectKickWidget(): void {
      const ch = getKickChannelFromUrl();
      if (ch && KICK_BLACKLIST.has(ch)) {
        injectWidget(reg!, tx, getKickPosition, reinjectKickWidget);
      }
    }

    function checkKickChannelPage(): void {
      const channel = getKickChannelFromUrl();
      const categorySlug = extractKickCategory(window.location.pathname);
      const categoryName = categorySlug ? BLOCKED_CATEGORIES.get(categorySlug) : undefined;


      if (channel && KICK_BLACKLIST.has(channel)) {
        const tryInject = () => {
          if (document.body) {
            injectOverlay(channel, tx);
            if (reg) injectWidget(reg, tx, getKickPosition, reinjectKickWidget);
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

    function checkKickStreamCategory(): void {
      const channel = getKickChannelFromUrl();
      if (!channel) { removeWidget(); return; }
      if (KICK_BLACKLIST.has(channel)) return;
      // Don't show widget on category browse pages
      if (extractKickCategory(window.location.pathname)) { removeWidget(); return; }

      // Look for a category link in the stream info (not inside browse cards)
      let streamSlug: string | null = null;
      for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/category/"]')) {
        if (link.closest('[data-testid="category-card-root"]')) continue;
        streamSlug = extractKickCategory(link.getAttribute('href') ?? '');
        if (streamSlug) break;
      }

      if (streamSlug && BLOCKED_CATEGORIES.has(streamSlug)) {
        if (reg) injectWidget(reg, tx, getKickPosition, reinjectKickWidget,
          `https://www.nogamblettv.app/?u=${encodeURIComponent(channel)}&p=kick#tip`);
      } else {
        removeWidget();
      }
    }

    // ─── Kick sidebar hiding ───────────────────────────────────────────────────

    const processedSidebarLinks = new WeakSet<HTMLAnchorElement>();

    function scanKickSidebar(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        'a[data-testid^="sidebar-following-channel-"], a[data-testid^="sidebar-recommended-channel-"]'
      );
      for (const link of links) {
        if (processedSidebarLinks.has(link)) continue;
        processedSidebarLinks.add(link);

        const channel = extractChannel(link.getAttribute('href') ?? '', KICK_RESERVED_PATHS);
        if (!channel || !KICK_BLACKLIST.has(channel)) continue;

        hideElement(link.closest<HTMLElement>('button') ?? link.parentElement as HTMLElement ?? link);
      }
    }

    // ─── Kick browse card hiding ───────────────────────────────────────────────

    const processedCardLinks = new WeakSet<HTMLAnchorElement>();

    function scanKickCards(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>('a[data-focus-target="true"]');
      for (const link of links) {
        if (processedCardLinks.has(link)) continue;
        processedCardLinks.add(link);

        const channel = extractChannel(link.getAttribute('href') ?? '', KICK_RESERVED_PATHS);
        if (!channel || !KICK_BLACKLIST.has(channel)) continue;

        hideElement(link.parentElement as HTMLElement ?? link);
      }
    }

    // ─── Kick category tile hiding ─────────────────────────────────────────────

    const processedCategoryLinks = new WeakSet<HTMLAnchorElement>();

    function scanKickCategories(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        '[data-testid="category-card-root"] a[href^="/category/"]'
      );
      for (const link of links) {
        if (processedCategoryLinks.has(link)) continue;
        processedCategoryLinks.add(link);

        const slug = extractKickCategory(link.getAttribute('href') ?? '');
        if (!slug || !BLOCKED_CATEGORIES.has(slug)) continue;

        hideElement(
          link.closest<HTMLElement>('[data-testid="category-card-root"]') ??
          link.parentElement as HTMLElement ??
          link
        );
      }
    }

    function scanAndHide(): void {
      scanKickSidebar();
      scanKickCards();
      scanKickCategories();
      checkKickStreamCategory();
    }

    // ─── SPA navigation detection ──────────────────────────────────────────────

    let lastUrl = window.location.href;

    function onNavigate(): void {
      const newUrl = window.location.href;
      if (newUrl === lastUrl) return;
      lastUrl = newUrl;

      removeOverlay();
      checkKickChannelPage();

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

    checkKickChannelPage();
    scanAndHide();
    setTimeout(scanAndHide, 1000);
    setTimeout(scanAndHide, 3000);
  },
});
