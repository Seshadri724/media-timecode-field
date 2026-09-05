# Extension plan

Build the overlay in a **new folder** (`media-timecode-seek-ext`), not inside this library’s demo. Copy `src/parse.ts` (or a tiny npm workspace later). Do not add YouTube selectors to `media-timecode-field.ts`.

## Phase 0 — Decide (1 day)

- Hosts in v1: **YouTube watch pages only**.
- Coursera: phase 2. Netflix: never in this plan.
- Success: on a 20+ minute YouTube video, type `1:17`, Enter, playhead within 0.5s. Remount after in-site navigation.

If that GIF is not obviously better than the native bar, stop. Do not add sites to compensate.

## Phase 1 — Skeleton (2–3 days)

- MV3 `manifest.json` with YouTube host permission only.
- Content script on `youtube.com/watch*`.
- Generic finder: main `HTMLVideoElement`.
- Shadow input: parse / clamp / Enter / Esc / ↑↓ (same keys as the library).
- Load unpacked in `chrome://extensions`. Manual test on one long video.

Exit: seek works after a full reload. No SPA yet.

## Phase 2 — YouTube SPA (2–3 days)

- Remount on YouTube client-side navigation.
- Park the field next to the current-time label if the node exists; else a corner overlay.
- Ignore Shorts and live if `duration` is `Infinity` or seek throws.
- Pause-safe: do not fight ads; if `currentTime` set is ignored, show invalid state and bail.

Exit: playlist click and related-video click still show the field.

## Phase 3 — Harden (2 days)

- No `eval`, no remote scripts.
- Keyboard does not leak to YouTube hotkeys while the field is focused.
- README: hosts, permissions, “not affiliated with YouTube.”
- Optional: store `enabled` boolean.

Exit: store listing draft. Still unlisted.

## Phase 4 — Coursera (only if phase 2 is boring and stable)

- New adapter file. New host permission. User can disable per site.
- MutationObserver on the lecture chrome.
- Test: one IBM/Coursera lecture URL you are enrolled in. Quizzes/labs out of scope.
- ToS: keep distribution unlisted unless counsel says otherwise.

## Phase 5 — Not in plan

- Netflix / DRM
- `<all_urls>`
- Syncing notes to a server
- Replacing this library with the extension
- Vue / Media Chrome inside the content script

## Order of work

1. Copy parse kernel.
2. YouTube content script + field.
3. SPA remount.
4. Store assets.
5. Coursera adapter or stop.

## Owner test each phase

Reload the extension. Open a video you already have the right to watch. Type a time from a comment. Enter. Confirm `currentTime`. Navigate in-app. Repeat. If selectors break, fix the adapter — do not add a new site.
