// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/media-timecode-field.ts';
import { MediaTimecodeField } from '../src/media-timecode-field.ts';
import {
  MEDIA_SEEK_REQUEST,
  MEDIA_TIMESTAMP_COPIED,
  MEDIA_TIMESTAMP_MARK,
} from '../src/events.ts';

describe('MediaTimecodeField Component', () => {
  let field: MediaTimecodeField;
  let shadowRoot: ShadowRoot;
  let input: HTMLInputElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    field = document.createElement('media-timecode-field') as MediaTimecodeField;
    document.body.appendChild(field);
    shadowRoot = field.shadowRoot!;
    input = shadowRoot.querySelector('input')!;
  });

  it('renders input with default 00:00', () => {
    expect(input).toBeDefined();
    expect(input.value).toBe('00:00');
    expect(field.hasAttribute('invalid')).toBe(false);
  });

  it('updates display when mediacurrenttime attribute changes', () => {
    field.setAttribute('mediaduration', '100');
    field.setAttribute('mediacurrenttime', '77');
    expect(input.value).toBe('01:17');
  });

  it('switches to hh:mm:ss format automatically when duration >= 3600', () => {
    field.setAttribute('mediaduration', '3600');
    field.setAttribute('mediacurrenttime', '75');
    expect(input.value).toBe('00:01:15');
    expect(field.hasAttribute('data-hours')).toBe(true);
  });

  it('does not overwrite input value from media updates while user is editing', () => {
    field.setAttribute('mediacurrenttime', '10');
    expect(input.value).toBe('00:10');

    // User focuses and types
    input.focus();
    input.value = '01:45';

    // Background playback fires an update
    field.setAttribute('mediacurrenttime', '11');

    // Input must preserve what user is typing!
    expect(input.value).toBe('01:45');
  });

  it('dispatches mediaseekrequest on Enter and exits edit mode', () => {
    field.setAttribute('mediaduration', '300');
    const seekSpy = vi.fn();
    field.addEventListener(MEDIA_SEEK_REQUEST, seekSpy);

    input.focus();
    input.value = '1:17';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(seekSpy).toHaveBeenCalledTimes(1);
    const event = seekSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toBe(77);
    expect(input.value).toBe('01:17');
    expect(field.hasAttribute('invalid')).toBe(false);
  });

  it('dispatches mediatimestampmark on Shift+Enter for review annotations', () => {
    field.setAttribute('mediaduration', '300');
    const markSpy = vi.fn();
    field.addEventListener(MEDIA_TIMESTAMP_MARK, markSpy);

    input.focus();
    input.value = '2:15';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));

    expect(markSpy).toHaveBeenCalledTimes(1);
    const markEvent = markSpy.mock.calls[0][0] as CustomEvent;
    expect(markEvent.detail.time).toBe(135);
    expect(markEvent.detail.formatted).toBe('02:15');
  });

  it('handles relative seeking like +30s and -15s', () => {
    field.setAttribute('mediaduration', '300');
    field.setAttribute('mediacurrenttime', '50');

    const seekSpy = vi.fn();
    field.addEventListener(MEDIA_SEEK_REQUEST, seekSpy);

    input.focus();
    input.value = '+30s';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(seekSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 80 }));
    expect(input.value).toBe('01:20');
  });

  it('handles percentage expressions like 50%', () => {
    field.setAttribute('mediaduration', '200');

    const seekSpy = vi.fn();
    field.addEventListener(MEDIA_SEEK_REQUEST, seekSpy);

    input.focus();
    input.value = '50%';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(seekSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 100 }));
    expect(input.value).toBe('01:40');
  });

  it('marks invalid on bad input and does not emit seek request', () => {
    field.setAttribute('mediacurrenttime', '30');
    const seekSpy = vi.fn();
    field.addEventListener(MEDIA_SEEK_REQUEST, seekSpy);

    input.focus();
    input.value = 'garbage';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(seekSpy).not.toHaveBeenCalled();
    expect(field.hasAttribute('invalid')).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.value).toBe('00:30'); // Reverts to previous
  });

  it('reverts to playback position on Escape', () => {
    field.setAttribute('mediacurrenttime', '45');
    expect(input.value).toBe('00:45');

    input.focus();
    input.value = '09:99';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(input.value).toBe('00:45');
    expect(field.hasAttribute('invalid')).toBe(false);
  });

  it('increments/decrements with Arrow keys', () => {
    field.setAttribute('mediaduration', '300');
    field.setAttribute('mediacurrenttime', '50');
    expect(input.value).toBe('00:50');

    input.focus();

    // ArrowUp (+1s)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(input.value).toBe('00:51');

    // ArrowDown (-1s)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(input.value).toBe('00:50');

    // Shift + ArrowUp (+10s)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
    expect(input.value).toBe('01:00');

    // Shift + ArrowDown (-10s)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
    expect(input.value).toBe('00:50');
  });

  it('isolates keyboard events so spacebar/arrows do not bubble to video player', () => {
    const parent = document.createElement('div');
    const parentKeySpy = vi.fn();
    parent.addEventListener('keydown', parentKeySpy);

    const isolatedField = document.createElement('media-timecode-field');
    parent.appendChild(isolatedField);
    document.body.appendChild(parent);

    const fieldInput = isolatedField.shadowRoot!.querySelector('input')!;
    fieldInput.focus();

    // Fire Space keydown on input
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    fieldInput.dispatchEvent(spaceEvent);

    // Must be stopped by stopPropagation() inside component
    expect(parentKeySpy).not.toHaveBeenCalled();
  });

  it('binds to raw HTMLMediaElement via media attribute', () => {
    const video = document.createElement('video');
    video.id = 'my-video';
    Object.defineProperty(video, 'duration', { value: 120, writable: true });
    Object.defineProperty(video, 'currentTime', { value: 25, writable: true });
    document.body.appendChild(video);

    const htmlField = document.createElement('media-timecode-field');
    htmlField.setAttribute('media', 'my-video');
    document.body.appendChild(htmlField);

    const htmlInput = htmlField.shadowRoot!.querySelector('input')!;
    expect(htmlInput.value).toBe('00:25');

    // Seeking via field updates HTML video currentTime directly
    htmlInput.focus();
    htmlInput.value = '1:10';
    htmlInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(video.currentTime).toBe(70);
  });

  it('handles media element appearing after the field connects', async () => {
    const htmlField = document.createElement('media-timecode-field');
    htmlField.setAttribute('media', 'delayed-video');
    document.body.appendChild(htmlField);

    // Media element does not exist initially
    expect(htmlField.shadowRoot!.querySelector('input')!.value).toBe('00:00');

    // Create and attach video now
    const video = document.createElement('video');
    video.id = 'delayed-video';
    Object.defineProperty(video, 'duration', { value: 300, writable: true });
    Object.defineProperty(video, 'currentTime', { value: 42, writable: true });
    document.body.appendChild(video);

    // Allow MutationObserver microtask to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(htmlField.shadowRoot!.querySelector('input')!.value).toBe('00:42');
  });

  it('copies timestamp URL and dispatches mediatimestampcopied', () => {
    field.setAttribute('mediacurrenttime', '77');
    const copySpy = vi.fn();
    field.addEventListener(MEDIA_TIMESTAMP_COPIED, copySpy);

    const copyBtn = shadowRoot.querySelector('#copy-btn') as HTMLButtonElement;
    expect(copyBtn).toBeDefined();

    copyBtn.click();

    expect(copySpy).toHaveBeenCalledTimes(1);
    const event = copySpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.time).toBe(77);
    expect(event.detail.formatted).toBe('01:17');
    expect(event.detail.url).toContain('#t=01:17');
  });
});
