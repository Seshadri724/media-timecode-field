export type TimecodeFormat = 'auto' | 'mm:ss' | 'hh:mm:ss';

/** Parse `90`, `1:30`, `01:02:45`. Returns null if the string is not a time. */
export function parseTimecode(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  if (!/^[\d:.]+$/.test(raw)) return null;

  const parts = raw.split(':');
  if (parts.length > 3) return null;

  const nums = parts.map((p) => {
    if (p === '' || p.endsWith('.')) return NaN;
    return Number(p);
  });
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

export function resolveFormat(
  format: TimecodeFormat,
  duration: number
): Exclude<TimecodeFormat, 'auto'> {
  if (format === 'hh:mm:ss') return 'hh:mm:ss';
  if (format === 'mm:ss') return 'mm:ss';
  return Number.isFinite(duration) && duration >= 3600 ? 'hh:mm:ss' : 'mm:ss';
}

export function formatTimecode(seconds: number, format: Exclude<TimecodeFormat, 'auto'>): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const pad = (n: number) => String(n).padStart(2, '0');

  if (format === 'hh:mm:ss') {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
  }

  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export function clampTime(seconds: number, duration: number): number {
  const t = Number.isFinite(seconds) ? seconds : 0;
  const min = 0;
  const max = Number.isFinite(duration) && duration > 0 ? duration : Infinity;
  return Math.min(max, Math.max(min, t));
}

/** Parse delta strings like `15`, `15s`, `2m`, `1m30s`, `1:30`, `1h10m`. */
export function parseDelta(str: string): number | null {
  const raw = str.trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes(':')) {
    return parseTimecode(raw);
  }

  const compoundRegex = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s?)?$/;
  const match = raw.match(compoundRegex);
  if (match && (match[1] != null || match[2] != null || match[3] != null)) {
    const hours = match[1] ? Number(match[1]) : 0;
    const mins = match[2] ? Number(match[2]) : 0;
    const secs = match[3] ? Number(match[3]) : 0;
    if (Number.isFinite(hours) && Number.isFinite(mins) && Number.isFinite(secs)) {
      const total = hours * 3600 + mins * 60 + secs;
      return total >= 0 ? total : null;
    }
  }

  return null;
}

/**
 * Parse absolute timecodes (`1:30`), relative offsets (`+30s`, `-1m`, `+1:15`),
 * percentages (`50%`), and keywords (`start`, `end`, `half`).
 * Returns clamped seconds, or null if the string is invalid.
 */
export function parseExpression(
  input: string,
  baseTime = 0,
  duration = Infinity
): number | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  // 1. Keywords
  if (raw === 'start') return 0;
  if (raw === 'end') {
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  }
  if (raw === 'half' || raw === 'middle') {
    return Number.isFinite(duration) && duration > 0 ? duration / 2 : 0;
  }

  // 2. Percentages (e.g. 50%, 25%)
  const percentMatch = raw.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const pct = Number(percentMatch[1]);
    if (Number.isFinite(pct) && pct >= 0 && Number.isFinite(duration) && duration > 0) {
      return clampTime((pct / 100) * duration, duration);
    }
    return null;
  }

  // 3. Relative offsets (+15s, -30, +1:30)
  if (raw.startsWith('+') || raw.startsWith('-')) {
    const sign = raw[0] === '+' ? 1 : -1;
    const deltaStr = raw.slice(1).trim();
    const delta = parseDelta(deltaStr);
    if (delta == null) return null;
    const base = Number.isFinite(baseTime) ? baseTime : 0;
    return clampTime(base + sign * delta, duration);
  }

  // 4. Standard absolute timecode (90, 1:30, 01:02:45)
  const abs = parseTimecode(raw);
  if (abs != null) {
    return clampTime(abs, duration);
  }

  return null;
}

/** Parse and seek any HTML5 video/audio. Supports timecodes and relative expressions. */
export function seekMedia(media: HTMLMediaElement, input: string): number | null {
  const time = parseExpression(input, media.currentTime, media.duration);
  if (time == null) return null;
  media.currentTime = time;
  return time;
}

