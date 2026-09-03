import { describe, expect, it } from 'vitest';
import { clampTime, formatTimecode, parseTimecode, resolveFormat } from '../src/parse.ts';

describe('parseTimecode', () => {
  it('parses seconds, mm:ss, and hh:mm:ss', () => {
    expect(parseTimecode('90')).toBe(90);
    expect(parseTimecode('1:30')).toBe(90);
    expect(parseTimecode('01:02:45')).toBe(3765);
    expect(parseTimecode('  1:02:45  ')).toBe(3765);
  });

  it('rejects junk', () => {
    expect(parseTimecode('')).toBeNull();
    expect(parseTimecode('abc')).toBeNull();
    expect(parseTimecode('1:2:3:4')).toBeNull();
    expect(parseTimecode('-30')).toBeNull();
  });
});

describe('formatTimecode', () => {
  it('pads mm:ss and hh:mm:ss', () => {
    expect(formatTimecode(90, 'mm:ss')).toBe('01:30');
    expect(formatTimecode(3765, 'hh:mm:ss')).toBe('01:02:45');
    expect(formatTimecode(3725, 'mm:ss')).toBe('62:05');
  });
});

describe('resolveFormat / clampTime', () => {
  it('uses hours when duration is an hour or more', () => {
    expect(resolveFormat('auto', 3599)).toBe('mm:ss');
    expect(resolveFormat('auto', 3600)).toBe('hh:mm:ss');
    expect(resolveFormat('mm:ss', 7200)).toBe('mm:ss');
  });

  it('clamps to [0, duration]', () => {
    expect(clampTime(-4, 100)).toBe(0);
    expect(clampTime(140, 100)).toBe(100);
    expect(clampTime(50, NaN)).toBe(50);
  });
});
