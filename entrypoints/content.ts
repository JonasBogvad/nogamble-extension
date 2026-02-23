export default defineContentScript({
  matches: ['https://www.twitch.tv/*'],
  runAt: 'document_idle',
  main() {
    // ─── Hardcoded blacklist (Phase 1 prototype) ───────────────────────────────
    // Lowercase Twitch usernames. Replace with remote fetch in Phase 2.
    const BLACKLISTED_USERNAMES: string[] = [
      'trainwreckstv',
      'roshtein',
      'nickslive',
      'itssliker',
      'classybeef',
      'xposed',
      'adinross',
      // Add more here while testing
    ];

    const BLACKLIST = new Set(BLACKLISTED_USERNAMES.map((n) => n.toLowerCase()));

    // ─── Utilities ─────────────────────────────────────────────────────────────

    /** Extract Twitch channel username from an href like "/channelname" */
    function extractChannel(href: string): string | null {
      // Twitch channel URLs are exactly /channelname (3–25 alphanumeric + underscore)
      // Ignore paths like /directory, /search, /settings etc.
      const match = href.match(/^\/([a-zA-Z0-9_]{3,25})(\/|$)/);
      if (!match) return null;
      const name = match[1].toLowerCase();
      // Exclude known Twitch non-channel paths
      const reserved = new Set(['directory', 'search', 'settings', 'subscriptions', 'wallet', 'inventory', 'drops', 'following', 'videos', 'clips', 'collections', 'schedule', 'squad']);
      if (reserved.has(name)) return null;
      return name;
    }

    /** Mark an element as hidden by this extension (idempotent). */
    function hideElement(el: HTMLElement): void {
      if (el.dataset.gbHidden) return;
      el.dataset.gbHidden = '1';
      el.style.setProperty('display', 'none', 'important');
    }

    /**
     * Walk up from a link to find the sidebar channel row container.
     * Sidebar structure: <div.side-nav-section> > ... > <a href="/channel">
     * We want the direct child of side-nav-section that wraps this channel row.
     */
    function findSidebarRow(link: HTMLAnchorElement): HTMLElement {
      let el: HTMLElement | null = link.parentElement;
      while (el) {
        const parent = el.parentElement;
        if (parent?.classList.contains('side-nav-section')) return el;
        // Safety: stop if we've walked too far
        if (parent?.tagName.toLowerCase() === 'nav' || parent?.tagName.toLowerCase() === 'aside') break;
        el = parent;
      }
      // Fallback: 3 levels up
      let fallback: HTMLElement = link;
      for (let i = 0; i < 3 && fallback.parentElement; i++) {
        fallback = fallback.parentElement as HTMLElement;
      }
      return fallback;
    }

    /**
     * Walk up from a stream card link to find the card container.
     * Twitch stream cards are wrapped in <article> elements.
     */
    function findCardContainer(link: HTMLAnchorElement): HTMLElement {
      let el: HTMLElement | null = link.parentElement;
      let steps = 0;
      while (el && steps < 8) {
        if (el.tagName.toLowerCase() === 'article') return el;
        if (el.tagName.toLowerCase() === 'main' || el.tagName.toLowerCase() === 'body') break;
        el = el.parentElement;
        steps++;
      }
      // Fallback: 4 levels up
      let fallback: HTMLElement = link;
      for (let i = 0; i < 4 && fallback.parentElement; i++) {
        fallback = fallback.parentElement as HTMLElement;
      }
      return fallback;
    }

    // ─── Channel page overlay ──────────────────────────────────────────────────

    let overlayInjected = false;

    function getChannelFromUrl(): string | null {
      return extractChannel(window.location.pathname);
    }

    function removeOverlay(): void {
      const existing = document.getElementById('gb-overlay');
      if (existing) {
        existing.remove();
        overlayInjected = false;
      }
    }

    function injectOverlay(username: string): void {
      if (overlayInjected) return;
      overlayInjected = true;

      const overlay = document.createElement('div');
      overlay.id = 'gb-overlay';

      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '999999',
        background: 'rgba(10, 10, 20, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roobert', Inter, 'Helvetica Neue', Arial, sans-serif",
        color: '#EFEFF1',
        textAlign: 'center',
        padding: '40px',
        boxSizing: 'border-box',
      });

      const icon = document.createElement('div');
      icon.textContent = '⚠️';
      icon.style.fontSize = '64px';
      icon.style.marginBottom = '24px';

      const headline = document.createElement('h1');
      headline.textContent = 'Gambling Content Warning';
      Object.assign(headline.style, {
        fontSize: '28px',
        fontWeight: '700',
        margin: '0 0 16px 0',
        color: '#FFCA28',
      });

      const desc = document.createElement('p');
      desc.textContent = `${username} has been flagged for promoting gambling on stream. Viewing this content may expose you to gambling promotion.`;
      Object.assign(desc.style, {
        fontSize: '16px',
        maxWidth: '480px',
        lineHeight: '1.6',
        margin: '0 0 32px 0',
        color: '#ADADB8',
      });

      const nudge = document.createElement('p');
      nudge.textContent = '💡 Did you know? Investing 800 kr/month for 10 years at 7% avg return = ~138,000 kr.';
      Object.assign(nudge.style, {
        fontSize: '14px',
        maxWidth: '480px',
        lineHeight: '1.6',
        margin: '0 0 40px 0',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        color: '#ADADB8',
      });

      const buttonRow = document.createElement('div');
      Object.assign(buttonRow.style, { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' });

      const backBtn = document.createElement('button');
      backBtn.textContent = '← Go Back';
      Object.assign(backBtn.style, {
        padding: '12px 28px',
        background: '#9147FF',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
      });
      backBtn.addEventListener('click', () => history.back());

      const proceedBtn = document.createElement('button');
      proceedBtn.textContent = 'Proceed Anyway';
      Object.assign(proceedBtn.style, {
        padding: '12px 28px',
        background: 'transparent',
        color: '#ADADB8',
        border: '1px solid #3D3D3F',
        borderRadius: '6px',
        fontSize: '15px',
        cursor: 'pointer',
      });
      proceedBtn.addEventListener('click', () => {
        overlay.remove();
        overlayInjected = false;
      });

      buttonRow.appendChild(backBtn);
      buttonRow.appendChild(proceedBtn);
      overlay.appendChild(icon);
      overlay.appendChild(headline);
      overlay.appendChild(desc);
      overlay.appendChild(nudge);
      overlay.appendChild(buttonRow);

      document.body.appendChild(overlay);
    }

    function checkChannelPage(): void {
      const channel = getChannelFromUrl();
      if (channel && BLACKLIST.has(channel)) {
        const tryInject = () => {
          if (document.body) injectOverlay(channel);
          else requestAnimationFrame(tryInject);
        };
        tryInject();
      } else {
        removeOverlay();
      }
    }

    // ─── Sidebar hiding ────────────────────────────────────────────────────────
    // Targets: channel links inside .side-nav-section (followed channels + recommended)
    // Hides the direct child row of the section, so no empty space is left.

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
    // Targets: preview card channel/title links using Twitch's stable data-a-target attrs.
    // Hides the wrapping <article> card so the grid reflows cleanly.

    const processedCardLinks = new WeakSet<HTMLAnchorElement>();

    function scanCards(): void {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        '[data-a-target="preview-card-channel-link"], [data-a-target="preview-card-title-link"]'
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
    }

    // ─── SPA navigation detection ──────────────────────────────────────────────

    let lastUrl = window.location.href;

    function onNavigate(): void {
      const newUrl = window.location.href;
      if (newUrl === lastUrl) return;
      lastUrl = newUrl;

      overlayInjected = false;
      checkChannelPage();

      setTimeout(scanAndHide, 500);
      setTimeout(scanAndHide, 1500);
    }

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => { originalPushState(...args); onNavigate(); };
    history.replaceState = (...args) => { originalReplaceState(...args); onNavigate(); };
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
