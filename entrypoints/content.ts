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
      headline.textContent = 'Gambling Advarsel';
      Object.assign(headline.style, {
        fontSize: '28px',
        fontWeight: '700',
        margin: '0 0 16px 0',
        color: '#FFCA28',
      });

      const desc = document.createElement('p');
      desc.textContent = `${username} er markeret for at reklamere for gambling på stream. At se dette indhold kan udsætte dig for gambling-reklame.`;
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
      nudgeHeadline.textContent = 'Vidste du det?';
      Object.assign(nudgeHeadline.style, {
        fontSize: '20px',
        fontWeight: '700',
        color: '#FFCA28',
        margin: '0 0 10px 0',
        letterSpacing: '0.3px',
      });

      const nudgeQuotes = [
        'Investerer du 800 kr/md. i 10 år med 7% gns. afkast, ender du på ~138.000 kr.',
        'Huset vinder altid. Gambling-sider er designet til at tage dine penge over tid.',
        'Renters rente er magisk: 300 kr/md. som 25-årig giver over 800.000 kr. ved pensionsalderen.',
        'Den gennemsnitlige ludomane taber 120.000 kr. om året – svarende til en ny bil hvert år.',
        'Et globalt indeksfond har aldrig givet negativt afkast over en 15-årig periode. Gambling kan tømme din konto på en aften.',
      ];
      const nudgeQuote = document.createElement('p');
      nudgeQuote.textContent = nudgeQuotes[Math.floor(Math.random() * nudgeQuotes.length)] ?? '';
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
      backBtn.textContent = '← Gå tilbage';
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
      proceedBtn.textContent = 'Fortsæt Alligevel';
      Object.assign(proceedBtn.style, {
        padding: '12px 28px',
        background: 'transparent',
        color: '#ADADB8',
        border: '1px solid #3A3A4A',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
      });
      proceedBtn.addEventListener('click', () => {
        removeOverlay();
        unmuteStream();
      });

      buttonRow.appendChild(backBtn);
      buttonRow.appendChild(proceedBtn);

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

      // Mute the stream while the overlay is visible — it runs in the background
      // so it resumes instantly if the user chooses to proceed.
      muteStream();
    }

    // ─── Stream mute ───────────────────────────────────────────────────────────

    function muteStream(): void {
      document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        v.muted = true;
      });
    }

    function unmuteStream(): void {
      document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        v.muted = false;
      });
    }

    function removeRofusWidget(): void {
      document.getElementById('gb-rofus')?.remove();
    }

    function checkChannelPage(): void {
      const channel = getChannelFromUrl();
      if (channel && BLACKLIST.has(channel)) {
        const tryInject = () => {
          if (document.body) {
            injectOverlay(channel);
            injectRofusWidget();
          } else {
            requestAnimationFrame(tryInject);
          }
        };
        tryInject();
      } else {
        removeOverlay();
        removeRofusWidget();
      }
    }

    // ─── ROFUS top bar widget ──────────────────────────────────────────────────
    // Fixed pill injected into the top bar area linking to the Danish
    // self-exclusion register for gambling (rofus.nu).

    function injectRofusWidget(): void {
      if (document.getElementById('gb-rofus')) return;

      if (!document.getElementById('gb-rofus-styles')) {
        const s = document.createElement('style');
        s.id = 'gb-rofus-styles';
        s.textContent = `
          @keyframes gb-toggle-slide {
            0%,  35% { left: 26px; }
            50%      { left: 2px; }
            85%      { left: 2px; }
            100%     { left: 26px; }
          }
        `;
        document.head.appendChild(s);
      }

      const widget = document.createElement('a');
      widget.id = 'gb-rofus';
      widget.href = 'https://www.rofus.nu/';
      widget.target = '_blank';
      widget.rel = 'noopener noreferrer';
      Object.assign(widget.style, {
        position: 'fixed',
        top: '120px',
        left: '260px',
        zIndex: '9998',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px 14px',
        background: '#0F1829',
        borderRadius: '10px',
        textDecoration: 'none',
        fontFamily: "'Roobert', Inter, 'Helvetica Neue', Arial, sans-serif",
        cursor: 'pointer',
        minWidth: '175px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.15s',
      });

      // ── Top row: ROFUS title + toggle ─────────────────────────────────────────
      const topRow = document.createElement('div');
      Object.assign(topRow.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      });

      const title = document.createElement('span');
      title.textContent = 'ROFUS';
      Object.assign(title.style, {
        color: '#FFFFFF',
        fontSize: '22px',
        fontWeight: '600',
        letterSpacing: '1.5px',
      });

      // Toggle: rounded track with pause-icon thumb on the right
      const track = document.createElement('div');
      Object.assign(track.style, {
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        background: '#4A5C8F',
        position: 'relative',
        flexShrink: '0',
      });

      const thumb = document.createElement('div');
      Object.assign(thumb.style, {
        position: 'absolute',
        left: '26px',   // starts on the right side of the 52px track
        top: '2px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        color: '#4A5C8F',
        fontWeight: '900',
        letterSpacing: '-1px',
        animation: 'gb-toggle-slide 10s ease-in-out infinite',
      });
      thumb.textContent = '\u23F8'; // ⏸ pause symbol

      track.appendChild(thumb);
      topRow.appendChild(title);
      topRow.appendChild(track);

      const question = document.createElement('span');
      question.textContent = 'Spiller du for meget?';
      Object.assign(question.style, {
        color: '#FFFFFF',
        fontSize: '11px',
        fontWeight: '500',
      });

      widget.appendChild(topRow);
      widget.appendChild(question);

      widget.addEventListener('mouseenter', () => {
        widget.style.borderColor = 'rgba(255,255,255,0.18)';
      });
      widget.addEventListener('mouseleave', () => {
        widget.style.borderColor = 'rgba(255,255,255,0.06)';
      });

      document.body.appendChild(widget);
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

      // Inject widget-specific animation if not already present
      if (!document.getElementById('gb-widget-styles')) {
        const s = document.createElement('style');
        s.id = 'gb-widget-styles';
        s.textContent = `
          @keyframes gb-dot-blink {
            0%, 100% { opacity: 1; box-shadow: 0 0 5px rgba(255, 80, 80, 0.7); }
            50%       { opacity: 0.25; box-shadow: none; }
          }
        `;
        document.head.appendChild(s);
      }

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

      // ── Expanded view (sidebar open) ──────────────────────────────────────────
      const expandedView = document.createElement('div');

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

      expandedView.appendChild(label);
      expandedView.appendChild(link);
      expandedView.appendChild(branding);

      // ── Compact view (sidebar collapsed) ─────────────────────────────────────
      const compactView = document.createElement('div');
      Object.assign(compactView.style, {
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
      });

      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#FF5050',
        animation: 'gb-dot-blink 1.6s ease-in-out infinite',
        flexShrink: '0',
      });

      const countLabel = document.createElement('div');
      countLabel.textContent = String(BLACKLIST.size);
      Object.assign(countLabel.style, {
        color: '#ADADB8',
        fontSize: '11px',
        fontWeight: '700',
        lineHeight: '1',
      });

      compactView.appendChild(dot);
      compactView.appendChild(countLabel);

      widget.appendChild(expandedView);
      widget.appendChild(compactView);
      firstSection.parentElement.insertBefore(widget, firstSection);

      // ── Responsive: switch mode when sidebar collapses ────────────────────────
      // The widget naturally resizes with the sidebar — no class-sniffing needed.
      const ro = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 999;
        const collapsed = width < 80;

        if (collapsed) {
          Object.assign(widget.style, {
            margin: '4px 4px 8px',
            padding: '6px 4px',
            borderLeft: 'none',
            background: 'transparent',
          });
          expandedView.style.display = 'none';
          compactView.style.display = 'flex';
        } else {
          Object.assign(widget.style, {
            margin: '4px 8px 8px',
            padding: '8px 10px',
            borderLeft: '3px solid #9147FF',
            background: 'rgba(145, 71, 255, 0.08)',
          });
          expandedView.style.display = 'block';
          compactView.style.display = 'none';
        }
      });
      ro.observe(widget);
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
