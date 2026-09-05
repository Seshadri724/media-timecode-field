# Extension architecture

Sibling product to `media-timecode-field`. The npm component stays for pages you own. The extension overlays type-to-seek on pages you do not own.

Shared kernel only: `parseTimecode`, `clampTime`, `formatTimecode` from `src/parse.ts`. Do not inject `<media-timecode-field>` or Media Chrome onto host sites.

## Goal

On a tab the user is already allowed to watch, they type `1:17` or `90` and the playing media seeks. One action. The site’s slider stays.

## Non-goals

- Netflix, Disney+, or any DRM / custom player without a usable `HTMLMediaElement`
- Downloading, unlocking, or bypassing paywalls
- Replacing the host player UI
- `<all_urls>` on day one

## Shape

Manifest V3 Chrome extension (Firefox later if the MV3 port is free).

```text
extension/
  manifest.json          MV3, host_permissions per site
  src/
    parse.ts             copy or package the existing kernel (no DOM)
    content.ts           find media, mount field, seek
    field.ts             shadow-DOM input (copy behavior, not the Chrome custom element)
    adapters/
      youtube.ts         how to get the <video> + where to park the field
      coursera.ts        same, different selectors
      generic.ts         fallback: largest playing <video> in this frame
  background.ts          optional: idle; no network
```

No remote code. No analytics. No account.

## Runtime

1. Content script matches listed hosts (`*://www.youtube.com/*`, `*://*.coursera.org/*`).
2. `all_frames: true` so nested iframes are tried. Cross-origin iframes the browser blocks stay blocked.
3. Adapter returns `{ media: HTMLMediaElement, mount: HTMLElement } | null`.
4. If `media.currentTime` is not readable/writable, abort that page. Do not fight DRM.
5. Mount a shadow-root input next to the host time label (or a small overlay if the label is not a real node).
6. On Enter: `parseTimecode` → `clampTime(t, media.duration)` → `media.currentTime = t`.
7. `MutationObserver` + `yt-navigate-finish` / SPA hooks: remount when the player is replaced.
8. `keydown` on the field `stopPropagation` so the host does not steal Space/arrows.

## Adapters

Each adapter is selectors + “which video is the lecture,” not a new parser.

| Adapter | Strategy | Fail closed |
| --- | --- | --- |
| `generic` | `document.querySelectorAll('video')`, pick the one with `!paused` or largest `clientWidth` | No media element |
| `youtube` | Watch page `video.html5-main-video` (or current equivalent); mount near `.ytp-time-current` | Live / Shorts / ads if seek is denied |
| `coursera` | Lecture `<video>` in the item player; mount near the `m:ss / m:ss` label | Labs, quizzes, non-video items |

Netflix is not an adapter. No EME reverse-engineering.

## Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://www.coursera.org/*"
  ]
}
```

`storage` only if we persist “enabled per site.” Default off for Coursera until the adapter is stable. YouTube first.

## Trust and store

- Chrome Web Store: single purpose (“type a time to seek on supported video sites”). List every host.
- Coursera / YouTube ToS may still forbid UI injection. Ship as optional, user-installed. Do not market “official Coursera tool.”
- Unlisted or GitHub install for v0. Personal use is the honest bar until legal review.

## Why this is not the library

| Library | Extension |
| --- | --- |
| Author embeds the tag | User installs the extension |
| `mediaseekrequest` / `media="id"` | `video.currentTime` on a found node |
| Stable API | Selectors rot when the host ships UI |
| MIT on npm | Store review + host ToS |

Same itch. Two artifacts.
