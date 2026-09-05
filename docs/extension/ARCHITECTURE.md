# Architecture — type-to-seek Chrome extension

## Goal

On a tab the user is already allowed to watch, show a field: type `1:17` / `90` / `01:02:45`, Enter, the playing media seeks. Keyboard: Esc cancel, ↑↓ ±1s.

## Constraint

The host page never imports our web component. We run in an isolated world, find an `HTMLVideoElement` (or give up), set `currentTime`.

```text
┌─────────────────────────────────────────┐
│  Host page (YouTube, Coursera, …)       │
│    <video>  ← we do not own this DOM    │
└──────────────────┬──────────────────────┘
                   │ content script
┌──────────────────▼──────────────────────┐
│  Extension (MV3)                        │
│  1. Host adapter → getVideo()           │
│  2. Overlay (Shadow DOM) → input        │
│  3. parseTimecode + clamp + currentTime │
└─────────────────────────────────────────┘
```

## Pieces

| Piece | Job |
| --- | --- |
| `manifest.json` (MV3) | `content_scripts` + **per-site** `host_permissions`. No remote code. Single purpose: type-to-seek. |
| `parse.ts` | Copy or import from the library. Zero Chrome APIs. |
| `overlay.ts` | Shadow root, input, same keys as the web component. Does not load Media Chrome. |
| `find-video.ts` | Default: largest visible `video` with `duration > 0`. |
| `hosts/youtube.ts` | SPA: `yt-navigate-finish` / MutationObserver; re-bind video after navigation. |
| `hosts/coursera.ts` | Optional v1.2. Same overlay; different finder if the lecture video is nested. |
| `background.ts` | Optional. Empty in v1 unless you need a toolbar toggle. |

```text
extension/
  manifest.json
  src/
    parse.ts          ← same logic as the npm package
    overlay.ts
    find-video.ts
    content.ts        ← boot: pick host → find video → mount overlay
    hosts/youtube.ts
    hosts/generic.ts  ← fallback for a matching origin
```

## Host adapter (tiny)

```ts
type HostAdapter = {
  match: (url: URL) => boolean;
  getVideo: () => HTMLVideoElement | null;
  mountPoint: () => HTMLElement | null; // where to put the overlay
  observe: (onChange: () => void) => () => void; // SPA teardown
};
```

If `getVideo()` is null, hide the overlay. Do not guess on audio-only or ads.

## Seek path

1. User commits a string.  
2. `parseTimecode` → null ⇒ invalid, no seek.  
3. `clampTime(t, video.duration)` → `video.currentTime = t`.  
4. If `currentTime` does not change (DRM / blocked), hide field and stop for that host.

## Why not reuse `<media-timecode-field>`

It needs `media="id"` or Media Chrome attributes. Host pages will not add those. Overlay + `HTMLVideoElement` is the extension architecture.

## Out of architecture

- Netflix, Disney+, any EME/DRM player without a usable `currentTime`
- Downloading, unlocking, skipping ads by cheating the player
- `<all_urls>`
- Vue/React wrappers
- Frame-accurate SMPTE

## Security

Content script only. No eval. Overlay in closed Shadow DOM so host CSS does not eat the input. Do not read cookies or course payloads. Do not send timestamps off-device in v1.
