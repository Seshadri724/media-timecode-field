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
