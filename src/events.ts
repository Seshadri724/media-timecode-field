/**
 * Typed event names and detail contracts for Media Timecode Field.
 */

/** Dispatched when seeking to a timecode or relative expression. Detail is numeric seconds. */
export const MEDIA_SEEK_REQUEST = 'mediaseekrequest';

/** Dispatched when Shift+Enter is pressed to drop an annotation / review pin. */
export const MEDIA_TIMESTAMP_MARK = 'mediatimestampmark';

/** Dispatched when the timestamp link is copied to clipboard. */
export const MEDIA_TIMESTAMP_COPIED = 'mediatimestampcopied';

export interface MediaSeekRequestDetail {
  time: number;
}

export interface MediaTimestampMarkDetail {
  time: number;
  formatted: string;
  rawInput: string;
}

export interface MediaTimestampCopiedDetail {
  time: number;
  formatted: string;
  url: string;
}

declare global {
  interface GlobalEventHandlersEventMap {
    [MEDIA_SEEK_REQUEST]: CustomEvent<number>;
    [MEDIA_TIMESTAMP_MARK]: CustomEvent<MediaTimestampMarkDetail>;
    [MEDIA_TIMESTAMP_COPIED]: CustomEvent<MediaTimestampCopiedDetail>;
  }
}
