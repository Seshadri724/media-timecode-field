# media-timecode-field

Type a time. The video goes there.

A Media Chrome control: `<media-timecode-field>` sits next to `<media-time-display>` (a label) and `<media-time-range>` (a slider). This one is an accessible text field that seeks.

**Live demo** (after GitHub Pages deploys): type `1:17` and press Enter — `https://<your-github-user>.github.io/media-timecode-field/`

```html
<media-controller>
  <video slot="media" src="video.mp4" playsinline></video>
  <media-control-bar>
    <media-play-button></media-play-button>
    <media-timecode-field></media-timecode-field>
    <media-time-range></media-time-range>
    <media-mute-button></media-mute-button>
  </media-control-bar>
</media-controller>
```

```js
import 'media-chrome';
import 'media-timecode-field';
```

## Why this exists

The slider is a map. It is the wrong tool when you already know `1:17:42`. This element accepts `90`, `1:30`, or `01:02:45`, clamps to duration, and dispatches Media Chrome’s `mediaseekrequest`. Nested in `<media-controller>`, or set `mediacontroller="id"` if it lives outside.

Works on any player that can seek to a time in seconds **and** embeds this control. It does not inject into Coursera, YouTube, or other sites’ chrome.

## Keyboard

| Key | Action |
| --- | --- |
| Click / Tab | Edit the current time |
| Enter | Seek and leave edit |
| Escape | Cancel |
| ↑ / ↓ | ±1 second (Shift: ±10) |

Typing does not leak into Media Chrome’s player shortcuts.

## Attributes

| Attribute | Default | Meaning |
| --- | --- | --- |
| `format` | `auto` | `auto` → `hh:mm:ss` if duration ≥ 1 hour, else `mm:ss`. Or force `mm:ss` / `hh:mm:ss`. |
| `disabled` | off | Not editable |
| `mediacontroller` | — | Controller `id` when the field is not nested |

Media Chrome writes `mediacurrenttime`, `mediaduration`, `mediaseekable` when the field is a state receiver (it observes those attributes).

## CSS

Uses Media Chrome tokens (`--media-font`, `--media-control-background`, `--media-focus-box-shadow`, …). Width: `--media-timecode-field-width`.

## Not this

Not frame-accurate SMPTE. HTML5 `currentTime` is seconds. Not a timeline framework. Not a review tool.

## Develop

```bash
npm install
npm test
npm run dev
```

GitHub Pages builds from `npm run build` (`dist/`) on push to `main`. See [PRD.md](./PRD.md).
