import 'media-chrome';
import '../../src/media-timecode-field.ts';
import { seekMedia } from '../../src/parse.ts';

const nasaVideo = document.getElementById('nasa-video') as HTMLVideoElement | null;
const pinsList = document.getElementById('pins-list') as HTMLElement | null;
const pinEmpty = document.getElementById('pin-empty') as HTMLElement | null;
const pinCount = document.getElementById('pin-count') as HTMLElement | null;

interface ReviewPin {
  id: string;
  time: number;
  formatted: string;
  label: string;
}

let pins: ReviewPin[] = [];

function renderPins(): void {
  if (!pinsList || !pinEmpty || !pinCount) return;

  if (pins.length === 0) {
    pinEmpty.style.display = 'block';
    pinCount.textContent = '0 pins';
    return;
  }

  pinEmpty.style.display = 'none';
  pinCount.textContent = `${pins.length} pin${pins.length === 1 ? '' : 's'}`;

  const existing = pinsList.querySelectorAll('.pin-item');
  existing.forEach((el) => el.remove());

  pins.forEach((pin) => {
    const item = document.createElement('div');
    item.className = 'pin-item';
    item.title = `Jump to ${pin.formatted}`;
    item.innerHTML = `
      <span class="pin-time">${pin.formatted}</span>
      <span class="pin-label">${escapeHtml(pin.label)}</span>
      <span style="font-size: 0.75rem; color: #8c93a0; margin-left: 8px;">Jump ↗</span>
    `;
    item.addEventListener('click', () => {
      if (nasaVideo) {
        nasaVideo.currentTime = pin.time;
      }
    });
    pinsList.appendChild(item);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Listen to review marker events (dispatched on Shift + Enter)
document.addEventListener('mediatimestampmark', ((e: CustomEvent) => {
  const { time, formatted } = e.detail;
  const label = window.prompt(`Add a review note for ${formatted}:`, `Note at ${formatted}`);
  if (label == null) return; // User cancelled prompt

  pins.unshift({
    id: String(Date.now()),
    time,
    formatted,
    label: label.trim() || `Review marker at ${formatted}`,
  });
  renderPins();
}) as EventListener);

// Quick test expression pills (+30s, -15s, 50%, etc.)
document.querySelectorAll<HTMLButtonElement>('.quick-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const expr = btn.dataset.expr;
    if (!expr || !nasaVideo) return;
    seekMedia(nasaVideo, expr);
  });
});

