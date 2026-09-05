import {
  clampTime,
  formatTimecode,
  parseDelta,
  parseExpression,
  parseTimecode,
  resolveFormat,
  type TimecodeFormat,
} from './parse.js';

import {
  MEDIA_SEEK_REQUEST,
  MEDIA_TIMESTAMP_COPIED,
  MEDIA_TIMESTAMP_MARK,
} from './events.js';

interface MediaControllerLike {
  associateElement?(el: Element): void;
  unassociateElement?(el: Element): void;
}

function getNumericAttr(el: Element, name: string): number {
  const v = el.getAttribute(name);
  if (v == null || v === '') return NaN;
  return Number(v);
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      font: var(--media-font,
        var(--media-font-weight, normal)
        var(--media-font-size, 14px) /
        var(--media-text-content-height, var(--media-control-height, 24px))
        var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
      color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
      background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
      padding: var(--media-control-padding, 10px);
      display: var(--media-control-display, var(--media-timecode-field-display, inline-flex));
      align-items: center;
      box-sizing: border-box;
      pointer-events: auto;
      gap: 3px;
    }
    :host(:focus-within) {
      box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
    }
    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }
    :host([invalid]) {
      box-shadow: inset 0 0 0 2px rgb(220 50 50 / .9);
    }
    input {
      font: inherit;
      color: inherit;
      background: transparent;
      border: 0;
      padding: 0;
      margin: 0;
      width: var(--media-timecode-field-width, 7.5ch);
      outline: none;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    :host([format="hh:mm:ss"]) input,
    :host([data-hours]) input {
      width: var(--media-timecode-field-width, 10.5ch);
    }
    .copy-btn {
      background: transparent;
      border: 0;
      padding: 2px 3px;
      margin: 0;
      color: inherit;
      opacity: 0.55;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: 3px;
      transition: opacity 0.15s ease, transform 0.15s ease;
      outline: none;
    }
    .copy-btn:hover {
      opacity: 1;
      transform: scale(1.1);
    }
    .copy-btn:focus-visible {
      opacity: 1;
      box-shadow: var(--media-focus-box-shadow, 0 0 0 2px rgb(27 127 204 / .9));
    }
    :host([no-copy]) .copy-btn {
      display: none;
    }
    .copied-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #1a1d24;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 11px;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.18s ease, transform 0.18s ease;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
      z-index: 100;
    }
    .copied-tooltip.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-2px);
    }
  </style>
  <input
    type="text"
    inputmode="text"
    autocomplete="off"
    spellcheck="false"
    aria-label="Seek to time or expression"
    list="chapters-list"
  />
  <datalist id="chapters-list"></datalist>
  <button type="button" class="copy-btn" id="copy-btn" aria-label="Copy timestamp link" title="Copy timestamp link">
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
      <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 0 0-4.243-4.243z"/>
    </svg>
    <span class="copied-tooltip" id="copied-tooltip">Copied!</span>
  </button>
`;

export class MediaTimecodeField extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'chapters',
      'disabled',
      'format',
      'media',
      'mediacontroller',
      'mediacurrenttime',
      'mediaduration',
      'mediaseekable',
      'no-copy',
    ];
  }

  #input: HTMLInputElement;
  #copyBtn: HTMLButtonElement;
  #tooltip: HTMLElement;
  #datalist: HTMLDataListElement;
  #tooltipTimeout = 0;
  #editing = false;
  #htmlMedia: HTMLMediaElement | null = null;
  #mediaController: MediaControllerLike | null = null;
  #mediaObserver: MutationObserver | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.append(template.content.cloneNode(true));
    this.#input = root.querySelector('input')!;
    this.#copyBtn = root.querySelector('#copy-btn')!;
    this.#tooltip = root.querySelector('#copied-tooltip')!;
    this.#datalist = root.querySelector('#chapters-list')!;
  }

  get format(): TimecodeFormat {
    const v = this.getAttribute('format');
    if (v === 'mm:ss' || v === 'hh:mm:ss' || v === 'auto') return v;
    return 'auto';
  }

  set format(value: TimecodeFormat) {
    this.setAttribute('format', value);
  }

  get mediaCurrentTime(): number {
    return getNumericAttr(this, 'mediacurrenttime');
  }

  set mediaCurrentTime(time: number) {
    if (!Number.isFinite(time)) this.removeAttribute('mediacurrenttime');
    else this.setAttribute('mediacurrenttime', String(time));
  }

  get mediaDuration(): number {
    return getNumericAttr(this, 'mediaduration');
  }

  set mediaDuration(time: number) {
    if (!Number.isFinite(time)) this.removeAttribute('mediaduration');
    else this.setAttribute('mediaduration', String(time));
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }

  connectedCallback(): void {
    this.#input.addEventListener('focus', this.#onFocus);
    this.#input.addEventListener('blur', this.#onBlur);
    this.#input.addEventListener('change', this.#onChange);
    this.#input.addEventListener('keydown', this.#onKeyDown);
    this.#copyBtn.addEventListener('click', this.#onCopyClick);
    window.addEventListener('hashchange', this.#onHashChange);
    this.#bindHtmlMedia();
    this.#syncFromMedia();
    this.#syncChapters();
    this.#associateController();
    this.#checkUrlHash();
  }

  disconnectedCallback(): void {
    this.#input.removeEventListener('focus', this.#onFocus);
    this.#input.removeEventListener('blur', this.#onBlur);
    this.#input.removeEventListener('change', this.#onChange);
    this.#input.removeEventListener('keydown', this.#onKeyDown);
    this.#copyBtn.removeEventListener('click', this.#onCopyClick);
    window.removeEventListener('hashchange', this.#onHashChange);
    clearTimeout(this.#tooltipTimeout);
    this.#stopMediaObserver();
    this.#unbindHtmlMedia();
    this.#mediaController?.unassociateElement?.(this);
    this.#mediaController = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'media') {
      if (this.isConnected) this.#bindHtmlMedia();
      return;
    }

    if (name === 'chapters') {
      if (this.isConnected) this.#syncChapters();
      return;
    }

    if (name === 'mediacontroller') {
      this.#mediaController?.unassociateElement?.(this);
      this.#mediaController = null;
      if (this.isConnected) this.#associateController();
      return;
    }

    if (name === 'disabled') {
      this.#input.disabled = this.disabled;
      this.#copyBtn.disabled = this.disabled;
      return;
    }

    if (!this.#editing) this.#syncFromMedia();
  }

  #associateController(): void {
    const id = this.getAttribute('mediacontroller');
    if (!id) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id) ?? document.getElementById(id);
    this.#mediaController = (el as unknown as MediaControllerLike) ?? null;
    this.#mediaController?.associateElement?.(this);
  }

  #resolveHtmlMedia(): HTMLMediaElement | null {
    const id = this.getAttribute('media');
    if (!id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id) ?? document.getElementById(id);
    return el instanceof HTMLMediaElement ? el : null;
  }

  #onHtmlTimeUpdate = (): void => {
    if (!this.#editing) this.#syncFromMedia();
  };

  #bindHtmlMedia(): void {
    this.#unbindHtmlMedia();
    this.#htmlMedia = this.#resolveHtmlMedia();
    if (this.#htmlMedia) {
      this.#stopMediaObserver();
      this.#htmlMedia.addEventListener('timeupdate', this.#onHtmlTimeUpdate);
      this.#htmlMedia.addEventListener('loadedmetadata', this.#onHtmlTimeUpdate);
      this.#syncFromMedia();
    } else if (this.getAttribute('media') && this.isConnected) {
      this.#startMediaObserver();
    }
  }

  #unbindHtmlMedia(): void {
    this.#stopMediaObserver();
    this.#htmlMedia?.removeEventListener('timeupdate', this.#onHtmlTimeUpdate);
    this.#htmlMedia?.removeEventListener('loadedmetadata', this.#onHtmlTimeUpdate);
    this.#htmlMedia = null;
  }

  #startMediaObserver(): void {
    this.#stopMediaObserver();
    const root = this.getRootNode() as Document | ShadowRoot;
    if (!root || typeof MutationObserver === 'undefined') return;
    this.#mediaObserver = new MutationObserver(() => {
      if (this.#resolveHtmlMedia()) {
        this.#bindHtmlMedia();
      }
    });
    this.#mediaObserver.observe(root, { childList: true, subtree: true });
  }

  #stopMediaObserver(): void {
    this.#mediaObserver?.disconnect();
    this.#mediaObserver = null;
  }

  #playhead(): number {
    const chrome = this.mediaCurrentTime;
    if (Number.isFinite(chrome)) return chrome;
    return this.#htmlMedia?.currentTime ?? 0;
  }

  #duration(): number {
    const chrome = this.mediaDuration;
    if (Number.isFinite(chrome) && chrome > 0) return chrome;
    const d = this.#htmlMedia?.duration;
    return d != null && Number.isFinite(d) ? d : NaN;
  }

  #displayFormat(): Exclude<TimecodeFormat, 'auto'> {
    return resolveFormat(this.format, this.#duration());
  }

  #syncFromMedia(): void {
    const fmt = this.#displayFormat();
    this.toggleAttribute('data-hours', fmt === 'hh:mm:ss');
    const t = this.#playhead();
    this.#input.value = formatTimecode(t, fmt);
  }

  #syncChapters(): void {
    this.#datalist.innerHTML = '';
    const attr = this.getAttribute('chapters');
    if (attr) {
      try {
        const list = JSON.parse(attr);
        if (Array.isArray(list)) {
          const fmt = this.#displayFormat();
          list.forEach((item: { time: number; label: string }) => {
            const opt = document.createElement('option');
            opt.value = formatTimecode(item.time, fmt);
            opt.textContent = item.label;
            this.#datalist.appendChild(opt);
          });
          return;
        }
      } catch {}
    }

    const root = this.getRootNode() as Document | ShadowRoot;
    const media = this.#htmlMedia ?? root.querySelector?.('video, audio');
    if (media instanceof HTMLMediaElement && media.textTracks) {
      const fmt = this.#displayFormat();
      for (let i = 0; i < media.textTracks.length; i++) {
        const track = media.textTracks[i];
        if (track.kind === 'chapters' && track.cues) {
          for (let j = 0; j < track.cues.length; j++) {
            const cue = track.cues[j] as { startTime: number; text?: string };
            const opt = document.createElement('option');
            opt.value = formatTimecode(cue.startTime, fmt);
            opt.textContent = cue.text || `Chapter ${j + 1}`;
            this.#datalist.appendChild(opt);
          }
        }
      }
    }
  }

  #onCopyClick = (e: MouseEvent): void => {
    e.stopPropagation();
    const time = Math.floor(this.#playhead());
    const fmt = this.#displayFormat();
    const formatted = formatTimecode(time, fmt);
    const url = new URL(window.location.href);
    url.hash = `t=${formatted}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url.toString()).catch(() => {});
    }

    this.#tooltip.classList.add('show');
    clearTimeout(this.#tooltipTimeout);
    this.#tooltipTimeout = window.setTimeout(() => {
      this.#tooltip.classList.remove('show');
    }, 1400);

    this.dispatchEvent(
      new CustomEvent(MEDIA_TIMESTAMP_COPIED, {
        bubbles: true,
        composed: true,
        detail: { time, formatted, url: url.toString() },
      })
    );
  };

  #onHashChange = (): void => {
    this.#checkUrlHash();
  };

  #checkUrlHash(): void {
    const hash = window.location.hash;
    if (!hash.startsWith('#t=')) return;
    const val = hash.slice(3);
    const parsed = parseExpression(val, 0, this.#duration());
    if (parsed != null && parsed > 0) {
      const time = clampTime(parsed, this.#duration());
      if (this.#htmlMedia) this.#htmlMedia.currentTime = time;
      this.dispatchEvent(
        new CustomEvent(MEDIA_SEEK_REQUEST, {
          bubbles: true,
          composed: true,
          detail: time,
        })
      );
    }
  }

  #onFocus = (): void => {
    if (this.disabled) return;
    this.#editing = true;
    this.removeAttribute('invalid');
    this.#input.removeAttribute('aria-invalid');
    this.#syncChapters();
    this.#input.select();
  };

  #onBlur = (): void => {
    if (!this.#editing) return;
    this.#commit(false);
  };

  #onChange = (): void => {
    if (!this.#editing) return;
    this.#commit(false);
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      this.#editing = false;
      this.#syncFromMedia();
      this.removeAttribute('invalid');
      this.#input.removeAttribute('aria-invalid');
      this.#input.blur();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const isShift = e.shiftKey;
      this.#commit(isShift);
      this.#input.blur();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const parsed = parseTimecode(this.#input.value);
      const base = parsed ?? this.#playhead();
      const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
      const next = clampTime(base + delta, this.#duration());
      this.#input.value = formatTimecode(next, this.#displayFormat());
      this.removeAttribute('invalid');
      this.#input.removeAttribute('aria-invalid');
    }
  };

  #commit(isMark = false): void {
    const raw = this.#input.value;
    const parsed = parseExpression(raw, this.#playhead(), this.#duration());
    this.#editing = false;

    if (parsed == null) {
      this.setAttribute('invalid', '');
      this.#input.setAttribute('aria-invalid', 'true');
      this.#syncFromMedia();
      return;
    }

    const time = clampTime(parsed, this.#duration());
    if (this.#htmlMedia) this.#htmlMedia.currentTime = time;
    this.dispatchEvent(
      new CustomEvent(MEDIA_SEEK_REQUEST, {
        bubbles: true,
        composed: true,
        detail: time,
      })
    );

    const fmt = this.#displayFormat();
    const formatted = formatTimecode(time, fmt);

    if (isMark) {
      this.dispatchEvent(
        new CustomEvent(MEDIA_TIMESTAMP_MARK, {
          bubbles: true,
          composed: true,
          detail: { time, formatted, rawInput: raw },
        })
      );
    }

    this.#input.value = formatted;
    this.removeAttribute('invalid');
    this.#input.removeAttribute('aria-invalid');
  }
}

if (!customElements.get('media-timecode-field')) {
  customElements.define('media-timecode-field', MediaTimecodeField);
}

declare global {
  interface HTMLElementTagNameMap {
    'media-timecode-field': MediaTimecodeField;
  }
}
