# NoGamble TTV – Extension

## Purpose

Chrome/Edge MV3 content script extension. Injects into Twitch and Kick and hides gambling-promoting streamers and categories. Shows warning overlays and a country-specific self-exclusion widget (11 countries supported).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | WXT v0.19 (Chromium MV3) |
| Language | TypeScript |
| Primary target | Chrome |
| Secondary target | Edge (via `build:edge`) |

## Repo

- GitHub: https://github.com/JonasBogvad/nogamble-extension
- Local: `C:\Github\Better Twitch TV by Jaxstyle\extension\`

## Build Commands

```bash
npm run build          # Chrome → .output/chrome-mv3/
npm run build:edge     # Edge   → .output/edge-mv3/
npm run zip            # Chrome zip for Web Store submission
npm run zip:edge       # Edge zip
npm run type-check     # tsc --noEmit
```

Load unpacked in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3/`
Load unpacked in Edge: `edge://extensions` → Developer mode → Load unpacked → `.output/edge-mv3/`

## Critical: tsconfig Must Not Use `extends`

The project directory has spaces in the path (`Better Twitch TV by Jaxstyle`). WXT/Vite's `require.resolve` URL-encodes the path and breaks when `tsconfig.json` uses `"extends": ".wxt/tsconfig.json"`.

**Fix:** `extension/tsconfig.json` inlines all `compilerOptions` directly. **Do NOT change it back to `"extends"`.**

## Critical: WXT Content Script Naming Convention

WXT only registers entrypoints as content scripts when the filename ends with `.content.ts` (or is named `content.ts`).

- `kick.content.ts` → registered for `https://kick.com/*` ✅
- `content-kick.ts` → built but NOT registered in manifest ❌

**Rule:** always name content scripts `<name>.content.ts`.

## Project Structure

```
extension/
├── wxt.config.ts               Manifest config: name, version, permissions, host_permissions
├── tsconfig.json               Inlined compilerOptions (no extends — see above)
├── utils/
│   ├── i18n.ts                 Translations (11 languages), registries (11 countries),
│   │                             LANGUAGE_MAP, TIMEZONE_MAP, detectLocaleAndRegistry()
│   ├── dom.ts                  Shared: extractChannel(href, reservedPaths?), hideElement(el)
│   ├── overlay.ts              Shared: injectOverlay(username, tx, isCategory?), removeOverlay(),
│   │                             muteStream(), unmuteStream()
│   └── widget.ts               Shared: injectWidget(reg, tx, getPosition, onAfterCooldown?),
│                                 removeWidget()
├── entrypoints/
│   ├── background.ts           Service worker: fetches + caches blacklist and categories (Twitch + Kick)
│   ├── content.ts              Twitch content script: hides streamers/categories, overlays, widgets
│   └── kick.content.ts         Kick content script: hides streamers/categories, overlays, widgets
└── public/
    └── icons/                  Extension icons (16, 48, 128px)
```

## Architecture

```
background.ts (service worker)
  ├── fetchBlacklist()        → GET /api/blacklist        → cache key: blacklist/blacklistTs
  ├── fetchKickBlacklist()    → GET /api/kicklist         → cache key: kickBlacklist/kickBlacklistTs
  ├── fetchCategories()       → GET /api/categories       → cache key: categories/categoriesTs
  ├── fetchKickCategories()   → GET /api/categories/kick  → cache key: kickCategories/kickCategoriesTs
  └── onMessage listener → GET_BLACKLIST | GET_KICK_BLACKLIST | GET_CATEGORIES | GET_KICK_CATEGORIES

utils/i18n.ts
  ├── LOCALES            — translations for 11 languages (da, en, sv, de, de-CH, nl, fr, fr-BE, it, pt, es)
  │     LocaleData fields: overlayHeadline, overlayDescChannel, overlayDescCategory, nudgeHeadline,
  │                        backBtn, proceedBtn, widgetQuestion, reportChannel, quotes[]
  ├── REGISTRIES         — 11 self-exclusion registries (ROFUS, GamStop, Spelpaus, OASIS, CRUKS, EPIS, RGIAJ, ANJ, RUA, SRIJ, Spielsperre)
  ├── LANGUAGE_MAP       — exact navigator.language code → locale + registry
  ├── TIMEZONE_MAP       — IANA timezone → locale + registry (fallback)
  └── detectLocaleAndRegistry() — navigator.languages exact match → timezone → English + no widget

utils/dom.ts
  ├── RESERVED_PATHS     — Twitch-specific reserved paths (default for extractChannel)
  ├── extractChannel(href, reservedPaths?) — matches /channelname (3–25 chars), excludes reserved paths
  └── hideElement(el)    — sets display:none, marks data-gb-hidden (idempotent)

utils/overlay.ts
  ├── injectOverlay(username, tx, isCategory?) — full-screen warning overlay
  ├── removeOverlay()    — removes overlay, resets injected flag
  ├── muteStream()       — mutes all video elements
  └── unmuteStream()     — unmutes all video elements

utils/widget.ts
  ├── injectWidget(reg, tx, getPosition, onAfterCooldown?, reportUrl?) — self-exclusion pill widget
  │     getPosition: () => { top, left } — platform-specific callback
  │     reportUrl: optional URL — when provided, shows "→ Tip this channel" row on hover
  └── removeWidget()     — removes widget, clears position interval

content.ts (injected into twitch.tv/*)
  NOTE: checkStreamCategory passes reportUrl = nogamblettv.app/?u={channel}&p=twitch#tip to injectWidget
  ├── sendMessage GET_BLACKLIST → Set<string>
  ├── sendMessage GET_CATEGORIES → Map<slug, name>
  ├── scanSidebar()         — hides blacklisted channels from followed/recommended sidebar
  ├── scanCards()           — hides blacklisted channels from stream card grids
  ├── scanCategories()      — hides blocked categories from /directory
  ├── checkChannelPage()    — overlay on direct nav to blacklisted channel/category
  ├── checkStreamCategory() — widget when non-blacklisted streamer plays a blocked category
  └── getTwitchWidgetPosition() — sidebar/theatre/fullscreen-aware positioning

kick.content.ts (injected into kick.com/*)
  ├── sendMessage GET_KICK_BLACKLIST → Set<string>
  ├── sendMessage GET_KICK_CATEGORIES → Map<slug, name>
  ├── scanKickSidebar()     — hides blacklisted channels from following/recommended sidebar
  ├── scanKickCards()       — hides blacklisted channels from browse cards
  ├── scanKickCategories()  — hides blocked category tiles
  ├── checkKickChannelPage() — overlay on direct nav to blacklisted channel/category
  ├── checkKickStreamCategory() — widget when non-blacklisted streamer plays a blocked category
  └── getKickPosition()     — theatre/sidebar-aware positioning
```

## Key Patterns

**Idempotent element processing** — `WeakSet` tracks already-processed links. `hideElement()` marks with `data-gb-hidden` to prevent double-processing.

**URL parsing**:
- `extractChannel(href, reservedPaths?)` — shared util, takes optional platform-specific reserved paths
- Twitch `extractCategory(href)` — matches `/directory/category/{slug}`
- Kick `extractKickCategory(href)` — matches `/category/{slug}`

**DOM traversal (Twitch)**:
- `findSidebarRow(link)` — walks up until parent contains more than one unique channel name
- `findCardContainer(link)` — targets `[data-target="directory-game__card_container"]?.parentElement`; falls back to `link.closest('article')`
- `scanCategories()` — targets `[data-target="directory-page__card-container"]?.parentElement`

**DOM traversal (Kick)**:

| Element | Selector | Container to hide |
|---------|----------|-------------------|
| Sidebar following | `a[data-testid^="sidebar-following-channel-"]` | `link.closest('button')` |
| Sidebar recommended | `a[data-testid^="sidebar-recommended-channel-"]` | `link.closest('button')` |
| Browse cards | `a[data-focus-target="true"]` | `link.parentElement` |
| Category tiles | `[data-testid="category-card-root"] a[href^="/category/"]` | `link.closest('[data-testid="category-card-root"]')` |

**SPA navigation** — both platforms poll `window.location.href` every 300ms + `popstate` event. Twitch's React Router caches `history.pushState` before the script runs so patching is unreliable.

**MutationObserver** — watches `document.documentElement` for child changes (debounced 150ms).

**Widget positioning (Twitch)** — uses button attribute checks (never DOM measurements):

| State | Selector | Condition |
|-------|----------|-----------|
| Sidebar collapsed | `[data-a-target="side-nav-arrow"]` | `aria-label` starts with `"Expand"` |
| Theatre mode | `button[aria-label^="Exit Theatre Mode"]` | element exists |
| Fullscreen | `[data-a-target="player-fullscreen-button"]` | `aria-label` starts with `"Exit"` |

**Widget positioning (Kick)** — confirmed via DevTools:

| State | Detection | `left` |
|-------|-----------|--------|
| Theatre mode | `[data-theatre="true"]` on `DIV.group/main` | `16px` |
| Sidebar expanded | `[aria-label="Collapse sidebar"]` exists | `272px` (256+16) |
| Sidebar collapsed | neither | `72px` (56+16) |
| Top | always | `80px` (navbar 60px + 20px) |

`document.fullscreenElement` is used only in the `fullscreenchange` event to re-parent the widget into the fullscreen element — that is the correct use of the native API.

## Internationalisation

Detection runs fully client-side — no network calls, no IP lookup:

1. **Exact language match** — scan `navigator.languages` in priority order against `LANGUAGE_MAP`
2. **Timezone fallback** — `Intl.DateTimeFormat().resolvedOptions().timeZone` against `TIMEZONE_MAP`
3. **Default** — English UI, no self-exclusion widget

Supported registries: ROFUS (DK), GamStop (GB), Spelpaus (SE), OASIS (DE), CRUKS (NL), EPIS (BE), RGIAJ (ES), ANJ (FR), RUA (IT), SRIJ (PT), Spielsperre (CH).

No widget is shown for unsupported countries (NO, PL, FI, AT) — overlay still shows in English.

To add a new language/country: edit `utils/i18n.ts` — add to `LOCALES`, `REGISTRIES`, `LANGUAGE_MAP`, and `TIMEZONE_MAP`.

## Permissions

| Permission | Reason |
|-----------|--------|
| `storage` | Cache blacklist + categories in `chrome.storage.local` |
| `host_permissions: twitch.tv/*` | Inject content script into Twitch |
| `host_permissions: kick.com/*` | Inject content script into Kick |
| `host_permissions: nogamblettv.app/*` | Fetch blacklist + categories from the API |

## What the Overlay Shows

- Full-screen dark overlay with warning in the user's detected language (11 languages)
- Rotating nudge message (financial literacy facts about gambling, currency-adapted per country)
- Two buttons: go back (history.back) and proceed (dismiss + unmute stream)
- Stream is muted while overlay is visible; unmuted if user proceeds

## What the Self-Exclusion Widget Shows

- Fixed pill in top-left area (repositions based on sidebar/theatre/fullscreen state)
- Links to the detected country's self-exclusion registry in a new tab
- Dismissable with × button; reappears after 5-minute cooldown
- Shown on: blacklisted channel pages AND non-blacklisted streams playing a blocked category
- Not shown on category browse pages (only on live stream pages)
- Not shown when no supported registry is detected for the user's country
- Animated toggle to attract attention
