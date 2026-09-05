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

The slider is a map. It is the wrong tool when you already know `1:17:42`. This accepts `90`, `1:30`, or `01:02:45`, clamps to duration, then seeks.

## Keyboard

| Key | Action |
| --- | --- |
| Click / Tab | Edit the current time |
| Enter | Seek and leave edit |
| Escape | Cancel |
| ↑ / ↓ | ±1 second (Shift: ±10) |

## Attributes

| Attribute | Default | Meaning |
| --- | --- | --- |
| `media` | — | `id` of a `<video>` or `<audio>` (HTML5 path) |
| `format` | `auto` | `auto` → `hh:mm:ss` if duration ≥ 1 hour, else `mm:ss` |
| `disabled` | off | Not editable |
| `mediacontroller` | — | Media Chrome controller `id` when the field is not nested |

## Not this

Not Coursera/YouTube overlays. Not SMPTE frames. Not a new player.

## Develop

```bash
npm install
npm test
npm run dev
```

See [PRD.md](./PRD.md).
