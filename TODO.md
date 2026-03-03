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

## Phase 3 – Community & reach 🚧

- [ ] "Is this streamer promoting gambling? Tip us →" link in ROFUS widget
        shown only on non-blacklisted streams in blocked categories
        links to `www.nogamblettv.app/#tip?streamer={username}` (pre-fills form)
        requires tip form to support `?streamer=` query param
- [ ] Firefox support (addons.mozilla.org)
        WXT supports Firefox out of the box — mostly namespace polyfill + AMO submission
        hold until Chrome is stable and audience justifies it
- [ ] YouTube support (future, separate phase)
