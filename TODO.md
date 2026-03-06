# TODO — nogamble-extension

## Phase 1 – Prototype ✅

- [x] Extension structure (WXT + TypeScript)
- [x] Hardcoded blacklist (`trainwreckstv`, `vader`)
- [x] Hide blacklisted streamers from sidebar, browse, homepage
- [x] Warning overlay on blacklisted channel pages (Danish)
- [x] SPA navigation detection (URL polling + popstate)
- [x] Stream muted while overlay is shown, unmuted on proceed
- [x] "Gå tilbage" + "Fortsæt Alligevel" buttons on overlay
- [x] 5 rotating Danish nudge quotes on overlay
- [x] ROFUS widget on blocked channel pages (animated toggle, dismissable)
- [x] ROFUS widget repositions for collapsed sidebar, theatre mode, fullscreen
- [x] Layout state detection via stable Twitch button attributes
- [x] Hide gambling category tiles on `/directory`
- [x] Warning overlay on blocked category pages
- [x] ROFUS widget on non-blacklisted streams playing a blocked category
- [x] Icons (16px, 48px, 128px)

## Phase 2 – Remote blacklist ✅

- [x] `background.ts` service worker fetches and caches blacklist + categories (15-min TTL)
- [x] `content.ts` requests data from background via `chrome.runtime.sendMessage`
- [x] API pointed to `www.nogamblettv.app`
- [x] `host_permissions` covers `nogamblettv.app`
- [x] Sidebar widget removed (left visible mark — broke no visual trace principle)
- [x] Fixed black spots on directory pages (card container targeting)
- [x] Fixed sidebar row hiding (unique channel name detection via Set)
- [x] ROFUS widget shifted right to avoid sidebar scrollbar overlap
- [x] Published on Chrome Web Store (v0.1.1)

## Phase 3 – Community & reach ✅

- [x] Internationalized overlay + widget: 11 languages, 11 self-exclusion registries
        detection via navigator.languages (exact match) → timezone fallback → English + no widget
        translations + registry data extracted to `utils/i18n.ts`
- [x] "Is this streamer promoting gambling? Tip us →" link in widget
        shown only on non-blacklisted streams in blocked categories
        links to `www.nogamblettv.app/?u={channel}&p=twitch#tip` (pre-fills form)
- [x] Firefox support (addons.mozilla.org)
        `build:firefox` + `zip:firefox` scripts (`--browser firefox --mv3`)
        gecko ID: `nogamble-ttv@nogamblettv.app`, `strict_min_version: '142.0'`
        `data_collection_permissions: { required: ['none'], optional: [] }`
        language-agnostic layout detection (`.side-nav--collapsed`, `[data-a-player-state="theatre"]`, `document.fullscreenElement`, `[data-testid="sidebar-collapse"]` for Kick)
        submitted to AMO at v0.3.3
- [ ] YouTube support (future, separate phase)
