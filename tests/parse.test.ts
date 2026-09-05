import { describe, expect, it } from 'vitest';
import {
  clampTime,
  formatTimecode,
  parseDelta,
  parseExpression,
  parseTimecode,
  resolveFormat,
  seekMedia,
} from '../src/parse.ts';

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

describe('parseDelta', () => {
  it('parses raw numbers and unit strings', () => {
    expect(parseDelta('15')).toBe(15);
    expect(parseDelta('15s')).toBe(15);
    expect(parseDelta('1m')).toBe(60);
    expect(parseDelta('1m30s')).toBe(90);
    expect(parseDelta('2h10m15s')).toBe(7815);
    expect(parseDelta('1:30')).toBe(90);
    expect(parseDelta('01:02:45')).toBe(3765);
  });

  it('rejects invalid deltas', () => {
    expect(parseDelta('')).toBeNull();
    expect(parseDelta('abc')).toBeNull();
    expect(parseDelta('s')).toBeNull();
  });
});

describe('parseExpression', () => {
  it('handles relative forward offsets (+)', () => {
    expect(parseExpression('+15', 50, 100)).toBe(65);
    expect(parseExpression('+15s', 50, 100)).toBe(65);
    expect(parseExpression('+1m', 50, 200)).toBe(110);
    expect(parseExpression('+1m30s', 50, 200)).toBe(140);
    expect(parseExpression('+1:30', 50, 200)).toBe(140);
    expect(parseExpression('+100s', 50, 100)).toBe(100); // clamped to duration
  });

  it('handles relative backward offsets (-)', () => {
    expect(parseExpression('-15', 50, 100)).toBe(35);
    expect(parseExpression('-15s', 50, 100)).toBe(35);
    expect(parseExpression('-1m', 90, 200)).toBe(30);
    expect(parseExpression('-1:30', 100, 200)).toBe(10);
    expect(parseExpression('-100s', 50, 100)).toBe(0); // clamped to 0
  });

  it('handles percentages and keywords', () => {
    expect(parseExpression('50%', 0, 200)).toBe(100);
    expect(parseExpression('25%', 0, 200)).toBe(50);
    expect(parseExpression('100%', 0, 200)).toBe(200);
    expect(parseExpression('start', 50, 200)).toBe(0);
    expect(parseExpression('end', 50, 200)).toBe(200);
    expect(parseExpression('half', 50, 200)).toBe(100);
    expect(parseExpression('middle', 50, 200)).toBe(100);
  });

  it('handles standard absolute timecodes', () => {
    expect(parseExpression('1:17', 0, 200)).toBe(77);
    expect(parseExpression('90', 0, 200)).toBe(90);
    expect(parseExpression('250', 0, 200)).toBe(200); // clamped
  });

  it('returns null on invalid expressions', () => {
    expect(parseExpression('+abc', 50, 100)).toBeNull();
    expect(parseExpression('-xyz', 50, 100)).toBeNull();
    expect(parseExpression('invalid', 50, 100)).toBeNull();
    expect(parseExpression('', 50, 100)).toBeNull();
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

describe('seekMedia', () => {
  it('sets currentTime on any HTMLMediaElement-like object with absolute and relative expressions', () => {
    const media = { currentTime: 50, duration: 200 } as HTMLMediaElement;
    expect(seekMedia(media, '1:17')).toBe(77);
    expect(media.currentTime).toBe(77);
    expect(seekMedia(media, '+15s')).toBe(92);
    expect(media.currentTime).toBe(92);
    expect(seekMedia(media, '50%')).toBe(100);
    expect(media.currentTime).toBe(100);
    expect(seekMedia(media, 'nope')).toBeNull();
  });
});

