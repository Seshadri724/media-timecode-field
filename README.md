# media-timecode-field

Type a time. The video goes there.

Works on **any HTML5 `<video>` or `<audio>` you control**, and as a Media Chrome control. It does not inject into Coursera, YouTube, or other people’s players.

**Live demo:** type `1:17` and press Enter — https://seshadri724.github.io/media-timecode-field/

## HTML5 (no framework)

```html
<video id="v" src="video.mp4" controls></video>
<media-timecode-field media="v"></media-timecode-field>
<script type="module" src="media-timecode-field.js"></script>
```

Or one function, any player API that exposes `currentTime` / `duration`:

```js
import { seekMedia } from 'media-timecode-field';
seekMedia(document.querySelector('video'), '1:17');
```

## Media Chrome

```html
<media-controller>
  <video slot="media" src="video.mp4" playsinline></video>
  <media-control-bar>
    <media-play-button></media-play-button>
    <media-timecode-field></media-timecode-field>
    <media-time-range></media-time-range>
  </media-control-bar>
</media-controller>
```

```js
import 'media-chrome';
import 'media-timecode-field';
```

## Why this exists

The slider is a map. It is the wrong tool when you already know `1:17:42` or want to jump forward `+30s`. This element accepts exact timecodes, relative deltas, and percentages, clamps to duration, and seeks.

## Supported Expressions

| Expression | Example | Behavior |
| --- | --- | --- |
| **Exact timecode** | `90`, `1:30`, `01:02:45` | Seeks directly to timestamp |
| **Relative forward** | `+15`, `+30s`, `+1m`, `+1:30` | Jumps forward relative to current playhead |
| **Relative backward** | `-15`, `-30s`, `-1m`, `-1:15` | Jumps backward relative to current playhead |
| **Percentage** | `50%`, `25%`, `75%` | Seeks to percentage of video duration |
| **Keywords** | `start`, `end`, `half` | Seeks to boundaries or halfway point |

## Keyboard & Actions

| Key / Action | Behavior |
| --- | --- |
| Click / Tab | Edit time or expression |
| Enter | Seek and exit edit |
| Shift + Enter | Seek and dispatch `mediatimestampmark` review pin event |
| Escape | Cancel and revert to playback time |
| ↑ / ↓ | Step ±1 second (Shift: ±10s) |
| 🔗 Copy Icon | Copies deep-link URL (`#t=01:17`) with visual feedback |

## Events

| Event | Target | Detail | Meaning |
| --- | --- | --- | --- |
| `mediaseekrequest` | Parent / Controller | `time` (seconds) | Dispatched when seeking |
| `mediatimestampmark` | Component | `{ time, formatted, rawInput }` | Dispatched on Shift+Enter for review/annotation tools |
| `mediatimestampcopied` | Component | `{ time, formatted, url }` | Dispatched when timestamp link is copied |

## Attributes

| Attribute | Default | Meaning |
| --- | --- | --- |
| `media` | — | `id` of an HTML5 `<video>` or `<audio>` element |
| `format` | `auto` | `auto` → `hh:mm:ss` if duration ≥ 1 hr, else `mm:ss` |
| `chapters` | — | JSON array of `[{"time": 0, "label": "Intro"}]` for native autocomplete |
| `no-copy` | off | Hide the copy deep-link button |
| `disabled` | off | Disable field |
| `mediacontroller` | — | Media Chrome controller `id` when outside controller |

## Not this

Not Coursera/YouTube overlays. Not SMPTE frames. Not a new player.

## Develop

```bash
npm install
npm test
npm run dev
```

See [PRD.md](./PRD.md).
