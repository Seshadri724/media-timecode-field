import {
  clampTime,
  formatTimecode,
  parseTimecode,
  resolveFormat,
  type TimecodeFormat,
} from './parse.js';

const MEDIA_SEEK_REQUEST = 'mediaseekrequest';

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
  </style>
  <input
    type="text"
    inputmode="numeric"
    autocomplete="off"
    spellcheck="false"
    aria-label="Seek to time"
  />
`;

export class MediaTimecodeField extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'disabled',
      'format',
      'media',
      'mediacontroller',
      'mediacurrenttime',
      'mediaduration',
      'mediaseekable',
    ];
  }

  #input: HTMLInputElement;
  #editing = false;
  #htmlMedia: HTMLMediaElement | null = null;
  #mediaController: { associateElement?(el: Element): void; unassociateElement?(el: Element): void } | null =
    null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.append(template.content.cloneNode(true));
    this.#input = root.querySelector('input')!;
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
    this.#bindHtmlMedia();
    this.#syncFromMedia();
    this.#associateController();
  }

  disconnectedCallback(): void {
    this.#input.removeEventListener('focus', this.#onFocus);
    this.#input.removeEventListener('blur', this.#onBlur);
    this.#input.removeEventListener('change', this.#onChange);
    this.#input.removeEventListener('keydown', this.#onKeyDown);
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

    if (name === 'mediacontroller') {
      this.#mediaController?.unassociateElement?.(this);
      this.#mediaController = null;
      if (this.isConnected) this.#associateController();
      return;
    }

    if (name === 'disabled') {
      this.#input.disabled = this.disabled;
      return;
    }

    if (!this.#editing) this.#syncFromMedia();
  }

  #associateController(): void {
    const id = this.getAttribute('mediacontroller');
    if (!id) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id);
    this.#mediaController = el as typeof this.#mediaController;
    this.#mediaController?.associateElement?.(this);
  }

  #resolveHtmlMedia(): HTMLMediaElement | null {
    const id = this.getAttribute('media');
    if (!id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id);
    return el instanceof HTMLMediaElement ? el : null;
  }

  #onHtmlTimeUpdate = (): void => {
    if (!this.#editing) this.#syncFromMedia();
  };

  #bindHtmlMedia(): void {
    this.#unbindHtmlMedia();
    this.#htmlMedia = this.#resolveHtmlMedia();
    this.#htmlMedia?.addEventListener('timeupdate', this.#onHtmlTimeUpdate);
    this.#htmlMedia?.addEventListener('loadedmetadata', this.#onHtmlTimeUpdate);
    this.#syncFromMedia();
  }

  #unbindHtmlMedia(): void {
    this.#htmlMedia?.removeEventListener('timeupdate', this.#onHtmlTimeUpdate);
    this.#htmlMedia?.removeEventListener('loadedmetadata', this.#onHtmlTimeUpdate);
    this.#htmlMedia = null;
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
    this.removeAttribute('invalid');
    this.#input.removeAttribute('aria-invalid');
  }

  #onFocus = (): void => {
    if (this.disabled) return;
    this.#editing = true;
    this.#input.select();
  };

  #onBlur = (): void => {
    if (!this.#editing) return;
    this.#commit();
  };

  #onChange = (): void => {
    if (!this.#editing) return;
    this.#commit();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      this.#editing = false;
      this.#syncFromMedia();
      this.#input.blur();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      this.#commit();
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
    }
  };

  #commit(): void {
    const parsed = parseTimecode(this.#input.value);
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
    this.#input.value = formatTimecode(time, this.#displayFormat());
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
