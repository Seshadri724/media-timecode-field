# Plan — type-to-seek Chrome extension

## v1 host: YouTube only

One origin, one adapter, unlisted or trusted testers first. Coursera is v1.2. Netflix is never.

## Phases

### 0 — Decide (done if you accept this plan)

- Product is an overlay, not the npm tag.
- Share parse/clamp only.
- Store listing: “Type a time to seek on YouTube.”

### 1 — Skeleton (1–2 days)

- MV3 manifest: `https://www.youtube.com/*` only.
- Content script logs `document.querySelectorAll('video')` on watch pages.
- Confirm a seekable `HTMLVideoElement` on a normal watch URL (not Shorts-first).

### 2 — Overlay + parse (2–3 days)

- Shadow DOM input next to the player (not inside YouTube’s time label — that node dies on re-render).
- Wire Enter / Esc / arrows.
- `currentTime` seek; clamp to `duration`.
- MutationObserver: if `video` is replaced, rebind. If gone, unmount.

### 3 — YouTube SPA (2 days)

- Re-run bind on navigation (`yt-navigate-finish` + URL poll fallback).
- Ignore ads-only videos if a main watch video exists (prefer longest duration / largest box).
- Keyboard: stopPropagation so YouTube does not steal digits while the field is focused.

### 4 — Quality bar (1–2 days)

- Does nothing on `/` home, search, without a playing watch video.
- Toggle in popup: on/off (optional).
- Manual test: 8min, 20min, 2h videos; type `1:17`, `90`, `1:02:45`.

### 5 — Ship

- Chrome Web Store: unlisted → public.
- Privacy: no analytics in v1.
- README: not affiliated with YouTube.

### 1.2 — Coursera (only if v1 is stable)

- New match: `https://www.coursera.org/*`.
- New `getVideo()` if the lecture is in an iframe (`all_frames: true` only if required).
- Expect breakage on Skills Network embeds. Document “lecture player only.”
- Legal: personal use / testers before a Coursera-branded store listing.

## Not in the plan

| Item | Why |
| --- | --- |
| Netflix | DRM; no honest `currentTime` contract |
| “All websites” | Rejection + support hell |
| Forking media-timecode-field into the content script as a CE | Wrong lifecycle |
| Monetization | After a working YouTube overlay |

## Risks

| Risk | Mitigation |
| --- | --- |
| YouTube DOM change | Overlay is sibling to player, not a patch of their time label |
| ToS / store | Accurate description; no scraping courses |
| Seek no-ops | Detect and disable host |
| SPA remount | Observe + navigate hooks |

## Success

A stranger installs on YouTube, types `1:17`, the watch video is at 1:17. That is the whole v1.
