# TODO — nogamble-extension

## Phase 1 – Prototype ✅

- [x] Extension structure (WXT + TypeScript)
- [x] Hardcoded blacklist (`trainwreckstv`, `vader`)
- [x] Hide blacklisted streamers from sidebar
- [x] Hide blacklisted streamers from browse / stream cards
- [x] Warning overlay on blacklisted channel pages (Danish)
- [x] SPA navigation detection (URL polling + popstate)
- [x] Stream muted while overlay is shown, unmuted on proceed
- [x] "Gå tilbage" + "Fortsæt Alligevel" buttons on overlay
- [x] 5 rotating Danish nudge quotes on overlay
- [x] Sidebar widget — blocked count + "Læs mere" link (Danish, no emoji)
- [x] Sidebar widget responsive to Twitch sidebar collapse
- [x] ROFUS widget on blocked channel pages only (animated toggle)
- [x] ROFUS widget dismiss button (hover-only ×, 5-min cooldown before reappearing)
- [x] ROFUS widget repositions for collapsed sidebar, theatre mode, and fullscreen
- [x] Layout state detection via stable Twitch button attributes (`data-a-target`, `aria-label`)
- [x] Fixed sidebar hiding bug — only blacklisted rows hidden, not entire section
- [x] Simplified card container detection — confirmed `<article>` wrapper via DevTools
- [x] Hide gambling category tiles on `/directory` (`data-a-target="tw-box-art-card-link"`)
- [x] Warning overlay when navigating directly to `/directory/category/slots` etc.
- [x] ROFUS widget on any stream currently live in a blocked category (`stream-game-link`)
- [x] Coverage verified via DevTools: homepage cards (`preview-card-image-link` added), category tiles (`tw-box-art-card-link`), and "Live Channels" sidebar section all caught by existing scanners
- [x] Add icons (16px, 48px, 128px) to `public/icons/`

## Phase 2 – Remote blacklist

- [ ] Add `background.ts` service worker
- [ ] `background.ts` fetches `GET https://<vercel-app>/api/blacklist` and caches in `chrome.storage.local` with 15-min TTL
- [ ] Add Vercel domain to `host_permissions` in `wxt.config.ts`
- [ ] Update `content.ts` to request blacklist from background via `chrome.runtime.sendMessage`
- [ ] Update Wall of Shame URL in sidebar widget from GitHub placeholder to real Vercel URL
- [ ] Add "Flag this streamer" button to channel page overlay → POST `/api/flag`

## Phase 3 – Polish

- [ ] Prominent unfollow prompt on blocked channel pages
- [ ] YouTube support
