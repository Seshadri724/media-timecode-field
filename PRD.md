# PRD: media-timecode-field

## Problem

When someone already knows a time, a web player only accepts a drag. `<media-time-display>` in Media Chrome is a label (click toggles remaining vs elapsed). `<media-time-range>` is a slider. There is no first-class type-to-seek control in that ecosystem.

## Goal

Ship one custom element that Media Chrome (and anyone copying the same event protocol) can drop into a control bar:

- Keyboard-first
- `mm:ss` and `hh:mm:ss` (and bare seconds)
- Clamp to duration
- Works with any Media Chrome player via `mediaseekrequest` + observed media UI attributes

Success is not a brand. Success is: Mux, Vidstack, or video.js can document or copy this pattern without adopting a framework.

## Non-goals

- Frame-accurate / SMPTE / `HH:MM:SS:FF` as a promise (HTML5 cannot honor it)
- Replacing the slider
- Markers, chapters, adapters, Vue wrappers, review/annotation
- Revenue this year
- A new player
- Injecting into Coursera, YouTube, or other third-party sites

## User

A developer already using Media Chrome who needs “jump to 1:17:42” for lecture, QC-lite, clip, or caption UIs.

## Requirements

1. Zero runtime dependencies. Peer: `media-chrome` for the demo and for association; the element only speaks the public event/attribute protocol.
2. Tag name `media-timecode-field` so it reads as a sibling of `media-time-display`.
3. Nested under `<media-controller>` **or** `mediacontroller="id"`.
4. While the input is focused, keydown does not bubble (Space / arrows must not steal to the player).
5. Invalid input: no seek, restore displayed time, `aria-invalid`.
6. Do not overwrite the field from `timeupdate` while editing.
7. Style with Media Chrome CSS variables so it looks native in the bar.

## Out of v1

Relative seek (`-30`), milliseconds, transcript search, YouTube extension, React wrapper.

## Metrics (honest)

- Does `npm test` cover parse / format / clamp?
- Can a stranger add the element next to `media-time-range` and type-to-seek in the demo?
- Would a Media Chrome maintainer recognize the `observedAttributes` + `mediaseekrequest` pattern without a design doc?

## Distribution

Companion package (this repo). GitHub Pages hosts the Vite `dist` demo. Offer as a PR to `muxinc/media-chrome` only after the element is boring and small.
