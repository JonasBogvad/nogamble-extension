export default defineContentScript({
  matches: ['https://www.twitch.tv/*'],
  runAt: 'document_idle',
  main() {
    // ─── Hardcoded blacklist (Phase 1 prototype) ───────────────────────────────
    // Lowercase Twitch usernames. Replace with remote fetch in Phase 2.
    const BLACKLISTED_USERNAMES: string[] = [
      'trainwreckstv',
      'vader',
    ];

    const BLACKLIST = new Set(BLACKLISTED_USERNAMES.map((n) => n.toLowerCase()));

    // ─── Utilities ─────────────────────────────────────────────────────────────

    /** Extract Twitch channel username from an href like "/channelname" */
    function extractChannel(href: string): string | null {
      // Twitch channel URLs are exactly /channelname (3–25 alphanumeric + underscore)
      // Ignore paths like /directory, /search, /settings etc.
      const match = href.match(/^\/([a-zA-Z0-9_]{3,25})(\/|$)/);
      if (!match || !match[1]) return null;
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

      // Inject keyframe animations once
      if (!document.getElementById('gb-styles')) {
        const style = document.createElement('style');
        style.id = 'gb-styles';
        style.textContent = `
          @keyframes gb-pop {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes gb-fade-up {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes gb-glow {
            0%, 100% { box-shadow: 0 0 12px rgba(255, 202, 40, 0.15); }
            50%       { box-shadow: 0 0 28px rgba(255, 202, 40, 0.35); }
          }
        `;
        document.head.appendChild(style);
      }

      const nudge = document.createElement('div');
      Object.assign(nudge.style, {
        maxWidth: '500px',
        margin: '0 0 40px 0',
        padding: '24px 28px',
        background: 'rgba(255, 202, 40, 0.06)',
        border: '1px solid rgba(255, 202, 40, 0.25)',
        borderRadius: '12px',
        textAlign: 'center',
        animation: 'gb-fade-up 0.5s ease 0.3s both, gb-glow 3s ease-in-out 0.8s infinite',
      });

      const nudgeBulb = document.createElement('div');
      nudgeBulb.textContent = '💡';
      Object.assign(nudgeBulb.style, {
        fontSize: '40px',
        marginBottom: '12px',
        display: 'block',
        animation: 'gb-pop 0.5s ease 0.6s both',
      });

      const nudgeHeadline = document.createElement('p');
      nudgeHeadline.textContent = 'Did you know?';
      Object.assign(nudgeHeadline.style, {
        fontSize: '20px',
        fontWeight: '700',
        color: '#FFCA28',
        margin: '0 0 10px 0',
        letterSpacing: '0.3px',
      });

      const nudgeQuote = document.createElement('p');
      nudgeQuote.textContent = 'Investing 800 kr/month for 10 years at 7% avg return = ~138,000 kr.';
      Object.assign(nudgeQuote.style, {
        fontSize: '18px',
        lineHeight: '1.7',
        color: '#EFEFF1',
        margin: '0',
        fontWeight: '500',
      });

      nudge.appendChild(nudgeBulb);
      nudge.appendChild(nudgeHeadline);
      nudge.appendChild(nudgeQuote);

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

      buttonRow.appendChild(backBtn);

      const branding = document.createElement('p');
      branding.textContent = 'Better Twitch TV by Jax Style';
      Object.assign(branding.style, {
        position: 'absolute',
        bottom: '20px',
        fontSize: '11px',
        color: '#6B6B7A',
        margin: '0',
      });

      overlay.appendChild(icon);
      overlay.appendChild(headline);
      overlay.appendChild(desc);
      overlay.appendChild(nudge);
      overlay.appendChild(buttonRow);
      overlay.appendChild(branding);

      document.body.appendChild(overlay);

      // Continuously kill the stream — Twitch will try to restart it
      startStreamKiller();
    }

    // ─── Stream killer ─────────────────────────────────────────────────────────

    let streamKillerInterval: ReturnType<typeof setInterval> | null = null;

    function killAllVideos(): void {
      document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        if (!v.paused) v.pause();
        if (!v.muted) v.muted = true;
      });
    }

    function hideMiniPlayer(): void {
      // Twitch's mini player shown in bottom-left when navigating away from a stream.
      // Target only the wrapper, not the main player container.
      const el = document.querySelector<HTMLElement>(
        '[data-a-target="persistent-player"]'
      );
      if (el) el.style.setProperty('display', 'none', 'important');
    }

    function startStreamKiller(): void {
      if (streamKillerInterval) return;
      killAllVideos();
      // Keep killing — Twitch restarts the player aggressively
      streamKillerInterval = setInterval(killAllVideos, 200);
    }

    function stopStreamKiller(): void {
      if (streamKillerInterval) {
        clearInterval(streamKillerInterval);
        streamKillerInterval = null;
      }
      // Hide whatever mini player Twitch spawned when we left
      hideMiniPlayer();
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
        stopStreamKiller();
      }
    }

    // ─── Sidebar widget ────────────────────────────────────────────────────────
    // Small banner injected above the first sidebar section showing blocked count
    // and linking to the Wall of Shame.

    // Placeholder — replace with real URL when better-twitch-tv-web is deployed
    const WALL_OF_SHAME_URL = 'https://github.com/JonasBogvad/better-twitch-tv-web';

    function injectSidebarWidget(): void {
      // Already injected and still in DOM
      if (document.getElementById('gb-widget')) return;

      const firstSection = document.querySelector('.side-nav-section');
      if (!firstSection?.parentElement) return;

      const widget = document.createElement('div');
      widget.id = 'gb-widget';
      Object.assign(widget.style, {
        margin: '4px 8px 8px',
        padding: '8px 10px',
        borderRadius: '4px',
        background: 'rgba(145, 71, 255, 0.08)',
        borderLeft: '3px solid #9147FF',
        boxSizing: 'border-box',
      });

      const label = document.createElement('div');
      Object.assign(label.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#EFEFF1',
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.4',
      });

      const labelEmoji = document.createElement('span');
      labelEmoji.textContent = '\uD83D\uDEAB';
      labelEmoji.style.flexShrink = '0';

      const labelText = document.createElement('span');
      labelText.textContent = `${BLACKLIST.size} gambling-streamere blokeret`;

      label.appendChild(labelEmoji);
      label.appendChild(labelText);

      const link = document.createElement('a');
      link.href = WALL_OF_SHAME_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Se Wall of Shame \u2192';
      Object.assign(link.style, {
        display: 'block',
        marginTop: '3px',
        color: '#9147FF',
        fontSize: '11px',
        textDecoration: 'none',
      });
      link.addEventListener('mouseenter', () => { link.style.textDecoration = 'underline'; });
      link.addEventListener('mouseleave', () => { link.style.textDecoration = 'none'; });

      const branding = document.createElement('div');
      branding.textContent = 'Better Twitch TV by Jax Style';
      Object.assign(branding.style, {
        marginTop: '6px',
        fontSize: '10px',
        color: '#6B6B7A',
      });

      widget.appendChild(label);
      widget.appendChild(link);
      widget.appendChild(branding);
      firstSection.parentElement.insertBefore(widget, firstSection);
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
      injectSidebarWidget();
      scanSidebar();
      scanCards();
    }

    // ─── SPA navigation detection ──────────────────────────────────────────────
    // Twitch uses React Router which caches a reference to history.pushState
    // before our content script runs — patching history.pushState is not reliable.
    // Poll for URL changes instead; this is the standard pattern for Twitch extensions.

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

    // Primary: poll every 300ms — imperceptible to users, catches all SPA navigations
    setInterval(onNavigate, 300);

    // Secondary: popstate covers browser back/forward button
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
