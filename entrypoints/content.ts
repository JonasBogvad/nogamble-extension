export default defineContentScript({
  matches: ['https://www.twitch.tv/*'],
  runAt: 'document_idle',
  async main() {
    // ─── Remote blacklist (Phase 2) ────────────────────────────────────────────
    // Fetched from background service worker, cached 15 min in chrome.storage.local
    let rawList: string[] = [];
    try {
      rawList = (await browser.runtime.sendMessage({ type: 'GET_BLACKLIST' })) as string[];
    } catch {
      rawList = [];
    }

    const BLACKLIST = new Set(rawList.map((n) => n.toLowerCase()));

    // ─── Remote categories (Phase 2) ───────────────────────────────────────────
    // Fetched from background service worker, cached 15 min in chrome.storage.local
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

    /** Extract gambling category slug from an href like "/directory/category/slots" */
    function extractCategory(href: string): string | null {
      const match = href.match(/^\/directory\/category\/([^/?]+)/i);
      return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null;
    }

    /** Mark an element as hidden by this extension (idempotent). */
    function hideElement(el: HTMLElement): void {
      if (el.dataset.gbHidden) return;
      el.dataset.gbHidden = '1';
      el.style.setProperty('display', 'none', 'important');
    }

    /**
     * Walk up from a sidebar link to find the individual channel row.
     * Strategy: keep walking up until the parent contains more than one
     * channel link — at that point we've reached a multi-channel container
     * and the current element is the single-channel row we want to hide.
     */
    function findSidebarRow(link: HTMLAnchorElement): HTMLElement {
      let el: HTMLElement = link;
      while (el.parentElement) {
        const parent = el.parentElement;
        // Count UNIQUE channel names — a single row may have multiple links to the
        // same channel (thumbnail, name, viewer-count), so we use a Set to avoid
        // stopping too early and only hiding the <a> instead of the whole row.
        const uniqueChannels = new Set<string>();
        for (const a of parent.querySelectorAll<HTMLAnchorElement>('a[href]')) {
          const ch = extractChannel(a.getAttribute('href') ?? '');
          if (ch) uniqueChannels.add(ch);
        }
        if (uniqueChannels.size > 1) return el; // parent holds multiple channels → el is the row
        // Hard stops
        if (['nav', 'aside', 'main', 'body'].includes(parent.tagName.toLowerCase())) return el;
        el = parent;
      }
      return el;
    }

    /**
     * Walk up from a stream card link to find the card container.
     * Twitch directory: the actual grid item is the parent of
     * [data-target="directory-game__card_container"], which sits several
     * levels above the <article>. Hiding just the <article> leaves the
     * outer grid cell as an empty dark box.
     */
    function findCardContainer(link: HTMLAnchorElement): HTMLElement {
      const cardContainer = link.closest<HTMLElement>('[data-target="directory-game__card_container"]');
      if (cardContainer?.parentElement) return cardContainer.parentElement as HTMLElement;
      return link.closest('article') ?? (link.parentElement as HTMLElement) ?? link;
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

    function injectOverlay(username: string, isCategory = false): void {
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
      desc.textContent = isCategory
        ? `${username} er en gambling-kategori på Twitch. At se dette indhold kan udsætte dig for gambling-reklame.`
        : `${username} er markeret for at reklamere for gambling på stream. At se dette indhold kan udsætte dig for gambling-reklame.`;
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
      branding.textContent = 'NoGamble';
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
      const categorySlug = extractCategory(window.location.pathname);
      const categoryName = categorySlug ? BLOCKED_CATEGORIES.get(categorySlug) : undefined;

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
      } else if (categoryName) {
        const tryInject = () => {
          if (document.body) {
            injectOverlay(categoryName, true);
            // No ROFUS widget on category pages — only on live streams
          } else {
            requestAnimationFrame(tryInject);
          }
        };
        tryInject();
      } else {
        removeOverlay();
        // ROFUS widget removal is handled by checkStreamCategory in scanAndHide,
        // which also accounts for streams playing a blocked category.
      }
    }

    // ─── Stream category check ─────────────────────────────────────────────────
    // Shows the ROFUS widget on any live stream currently playing a blocked category
    // (e.g. a non-blacklisted streamer who happens to be playing Slots).
    // Called from scanAndHide so it reacts to dynamic DOM updates.

    function checkStreamCategory(): void {
      const channel = getChannelFromUrl();

      // Not on a channel page — ensure widget is gone
      if (!channel) { removeRofusWidget(); return; }

      // Blacklisted channel or blocked category URL — checkChannelPage handles it
      if (BLACKLIST.has(channel)) return;
      if (BLOCKED_CATEGORIES.has(extractCategory(window.location.pathname) ?? '')) return;

      const gameLink = document.querySelector<HTMLAnchorElement>('[data-a-target="stream-game-link"]');
      const streamSlug = gameLink ? extractCategory(gameLink.getAttribute('href') ?? '') : null;

      if (streamSlug && BLOCKED_CATEGORIES.has(streamSlug)) {
        injectRofusWidget();
      } else {
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
            0%, 8%   { left: 2px;  animation-timing-function: ease-in; }
            21%      { left: 34px; animation-timing-function: ease-out; }
            25%      { left: 27px; animation-timing-function: ease-in-out; }
            29%, 82% { left: 30px; }
            93%, 100% { left: 2px; }
          }
          @keyframes gb-toggle-track {
            0%, 8%    { background: #2E3D6B; }
            29%, 82%  { background: #5B72B8; }
            93%, 100% { background: #2E3D6B; }
          }
          @keyframes gb-toggle-glow {
            0%, 27%   { box-shadow: none; }
            31%       { box-shadow: 0 0 0 4px rgba(255,255,255,0.28); }
            40%, 80%  { box-shadow: 0 0 0 2px rgba(255,255,255,0.10); }
            90%, 100% { box-shadow: none; }
          }
          @keyframes gb-icon-play {
            0%, 18%   { opacity: 1; }
            25%, 92%  { opacity: 0; }
            97%, 100% { opacity: 1; }
          }
          @keyframes gb-icon-pause {
            0%, 18%   { opacity: 0; }
            25%, 92%  { opacity: 1; }
            97%, 100% { opacity: 0; }
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
        left: '268px',
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
        width: '60px',
        height: '32px',
        borderRadius: '16px',
        background: '#2E3D6B',
        position: 'relative',
        flexShrink: '0',
        animation: 'gb-toggle-track 10s ease-in-out infinite',
      });

      const thumb = document.createElement('div');
      Object.assign(thumb.style, {
        position: 'absolute',
        left: '2px',    // starts on the left (play position)
        top: '2px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        color: '#4A5C8F',
        fontWeight: '900',
        animation: 'gb-toggle-slide 10s ease-in-out infinite, gb-toggle-glow 10s ease-in-out infinite',
      });

      function makeSvg(pathData: string): SVGSVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', '#0F1829');
        Object.assign(svg.style, {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '20px',
        });
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', '#0F1829');
        svg.appendChild(path);
        return svg;
      }

      // Play — filled triangle
      const playIcon = makeSvg('M8 5v14l11-7z');
      playIcon.style.animation = 'gb-icon-play 10s ease-in-out infinite';

      // Pause — two filled bars
      const pauseIcon = makeSvg('M6 19h4V5H6v14zm8-14v14h4V5h-4z');
      pauseIcon.style.opacity = '0';
      pauseIcon.style.animation = 'gb-icon-pause 10s ease-in-out infinite';

      thumb.appendChild(playIcon);
      thumb.appendChild(pauseIcon);

      track.appendChild(thumb);
      topRow.appendChild(title);
      topRow.appendChild(track);

      const question = document.createElement('span');
      question.textContent = 'Spiller du for meget?';
      Object.assign(question.style, {
        color: '#FFFFFF',
        fontSize: '16px',
        fontWeight: '500',
      });

      widget.appendChild(topRow);
      widget.appendChild(question);

      // ── Dismiss button (×) ────────────────────────────────────────────────────
      const ROFUS_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown before reappearing

      const dismissBtn = document.createElement('button');
      dismissBtn.textContent = '×';
      Object.assign(dismissBtn.style, {
        position: 'absolute',
        top: '-9px',
        right: '-9px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#2E3D6B',
        border: 'none',
        color: '#FFFFFF',
        fontSize: '14px',
        lineHeight: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        padding: '0',
        opacity: '0',
        transition: 'opacity 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      dismissBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeRofusWidget();
        setTimeout(() => {
          const channel = getChannelFromUrl();
          if (channel && BLACKLIST.has(channel)) injectRofusWidget();
        }, ROFUS_COOLDOWN_MS);
      });
      widget.appendChild(dismissBtn);

      widget.addEventListener('mouseenter', () => {
        widget.style.borderColor = 'rgba(255,255,255,0.18)';
        dismissBtn.style.opacity = '1';
      });
      widget.addEventListener('mouseleave', () => {
        widget.style.borderColor = 'rgba(255,255,255,0.06)';
        dismissBtn.style.opacity = '0';
      });

      document.body.appendChild(widget);

      // ── Track layout state via stable Twitch button attributes ───────────────
      // Same pattern for all three states — no DOM measurements needed.
      const isSidebarCollapsed = (): boolean => {
        const btn = document.querySelector<HTMLElement>('[data-a-target="side-nav-arrow"]');
        return btn?.getAttribute('aria-label')?.startsWith('Expand') ?? false;
      };

      const isTheatreMode = (): boolean =>
        document.querySelector('button[aria-label^="Exit Theatre Mode"]') !== null;

      const isFullscreen = (): boolean => {
        const btn = document.querySelector<HTMLElement>('[data-a-target="player-fullscreen-button"]');
        return btn?.getAttribute('aria-label')?.startsWith('Exit') ?? false;
      };

      const updateRofusPosition = (): void => {
        const w = document.getElementById('gb-rofus');
        if (!w) { clearInterval(rotusPosInterval); return; }
        if (isFullscreen() || isTheatreMode()) {
          w.style.top = '46px';
          w.style.left = '16px';
        } else if (isSidebarCollapsed()) {
          w.style.top = '120px';
          w.style.left = '60px';
        } else {
          const section = document.querySelector<HTMLElement>('.side-nav-section');
          const nav = section?.closest<HTMLElement>('aside, nav') ?? section?.parentElement ?? null;
          const navWidth = nav ? nav.getBoundingClientRect().width : 240;
          w.style.top = '120px';
          w.style.left = `${navWidth + 24}px`;
        }
      };
      const rotusPosInterval = setInterval(updateRofusPosition, 300);

      // Re-parent widget into the fullscreen element so it stays visible,
      // and reposition to top-left corner with breathing room.
      document.addEventListener('fullscreenchange', () => {
        const w = document.getElementById('gb-rofus');
        if (!w) return;
        if (document.fullscreenElement) {
          document.fullscreenElement.appendChild(w);
          w.style.top = '46px';
          w.style.left = '16px';
          w.style.right = 'auto';
        } else {
          document.body.appendChild(w);
          w.style.top = '120px';
          w.style.left = '268px';
          w.style.right = 'auto';

        }
      });
    }

    // ─── Category tile hiding ──────────────────────────────────────────────────
    // Hides gambling category tiles on /directory using data-a-target="tw-box-art-card-link".
    // Confirmed via DevTools: card link parent is the individual tile wrapper.

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
