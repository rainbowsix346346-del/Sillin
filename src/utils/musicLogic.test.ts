import test from 'node:test';
import assert from 'node:assert/strict';
import { Album, Track } from '../types/music';
import {
  buildQuickMixes,
  computeCarouselOffset,
  formatTime,
  getActiveLyricIndex,
  getLibraryCounts,
  getNextTrackIndex,
  getPrevTrackIndex,
  parseLocalFileName,
  searchCatalog,
} from './musicLogic';
import { computeRefinedAccentFromRgb, rgbToHsl } from './colorExtract';
import {
  angleDeltaToTimeDelta,
  normalizeAngleDelta,
  parseLrcOrPlainLyrics,
} from './lrcParser';
import { parseAudioMetadataBuffer } from './id3Parser';
import { filterTracksByLibraryRules, formatCacheSize } from './localScanner';
import { detectDefaultLanguage } from '../data/catalog';
import {
  buildMediaMetadataPayload,
  buildMediaPositionState,
  registerMediaSessionHandlers,
} from './mediaSession';

const SAMPLE_ALBUMS: Album[] = [
  {
    id: 'alb-1',
    title: 'Evening Tape',
    artist: 'Clara',
    year: 2025,
    genre: 'Folk',
    coverUrl: '',
    fallbackGradient: ['#4A558F', '#8E98C9'],
    trackIds: ['t-1', 't-2'],
    accentHint: '#4A558F',
    addedOrder: 2,
    rediscoverNote: 'Local recording',
  },
];

const SAMPLE_TRACKS: Track[] = [
  {
    id: 't-1',
    title: 'Morning Rain',
    artist: 'Clara',
    albumId: 'alb-1',
    albumTitle: 'Evening Tape',
    genre: 'Folk',
    year: 2025,
    duration: 210,
    coverUrl: '',
    fallbackGradient: ['#4A558F', '#8E98C9'],
    isFavorite: true,
    isLocalFile: true,
    folderPath: 'Music/Clara',
    audioUrl: 'blob:test-1',
    addedOrder: 2,
    lyrics: [
      { time: 0, text: 'First line' },
      { time: 18, text: 'Second line' },
    ],
  },
  {
    id: 't-2',
    title: 'Harbor Mist',
    artist: 'Soren',
    albumId: 'alb-1',
    albumTitle: 'Evening Tape',
    genre: 'Ambient',
    year: 2024,
    duration: 18,
    coverUrl: '',
    fallbackGradient: ['#8F5C44', '#D1A68A'],
    isFavorite: false,
    isLocalFile: true,
    folderPath: 'WhatsApp Audio/Voice Notes',
    audioUrl: 'blob:test-2',
    addedOrder: 1,
    lyrics: [],
  },
];

function buildSyntheticId3v23Buffer(): ArrayBuffer {
  const enc = new TextEncoder();
  const makeTextFrame = (id: string, text: string) => {
    const payload = enc.encode(text);
    const frame = new Uint8Array(10 + 1 + payload.length);
    frame.set(enc.encode(id), 0);
    const size = 1 + payload.length;
    frame[4] = (size >>> 24) & 0xff;
    frame[5] = (size >>> 16) & 0xff;
    frame[6] = (size >>> 8) & 0xff;
    frame[7] = size & 0xff;
    frame[10] = 3; // UTF-8
    frame.set(payload, 11);
    return frame;
  };

  // Minimal valid PNG header + bytes (>16 bytes)
  const fakePng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,
  ]);
  const mimeBytes = enc.encode('image/png');
  const apicPayloadSize = 1 + mimeBytes.length + 1 + 1 + 1 + fakePng.length;
  const apicFrame = new Uint8Array(10 + apicPayloadSize);
  apicFrame.set(enc.encode('APIC'), 0);
  apicFrame[4] = (apicPayloadSize >>> 24) & 0xff;
  apicFrame[5] = (apicPayloadSize >>> 16) & 0xff;
  apicFrame[6] = (apicPayloadSize >>> 8) & 0xff;
  apicFrame[7] = apicPayloadSize & 0xff;
  let p = 10;
  apicFrame[p++] = 0; // ISO-8859-1
  apicFrame.set(mimeBytes, p);
  p += mimeBytes.length;
  apicFrame[p++] = 0; // null after mime
  apicFrame[p++] = 3; // front cover
  apicFrame[p++] = 0; // empty description null
  apicFrame.set(fakePng, p);

  const frames = [
    makeTextFrame('TIT2', 'Glass Horizon'),
    makeTextFrame('TPE1', 'Amina Sol'),
    makeTextFrame('TALB', 'Periwinkle Sessions'),
    apicFrame,
  ];
  const bodyLen = frames.reduce((s, f) => s + f.length, 0);
  const full = new Uint8Array(10 + bodyLen);
  full.set(enc.encode('ID3'), 0);
  full[3] = 3; // ID3v2.3
  full[4] = 0;
  full[5] = 0;
  // synchsafe size
  full[6] = (bodyLen >>> 21) & 0x7f;
  full[7] = (bodyLen >>> 14) & 0x7f;
  full[8] = (bodyLen >>> 7) & 0x7f;
  full[9] = bodyLen & 0x7f;

  let offset = 10;
  for (const f of frames) {
    full.set(f, offset);
    offset += f.length;
  }
  return full.buffer;
}

test('formatTime formats seconds into clean mm:ss strings', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9), '0:09');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(218), '3:38');
  assert.equal(formatTime(-5), '0:00');
});

test('parseLocalFileName extracts artist and title cleanly', () => {
  assert.deepEqual(parseLocalFileName('Bill Evans - Peace Piece.mp3'), {
    artist: 'Bill Evans',
    title: 'Peace Piece',
  });
  assert.deepEqual(parseLocalFileName('morning_rain_demo.wav'), {
    artist: 'Local Archive',
    title: 'morning rain demo',
  });
});

test('parseAudioMetadataBuffer extracts ID3v2.3 tags and embedded PNG APIC artwork', () => {
  const buf = buildSyntheticId3v23Buffer();
  const meta = parseAudioMetadataBuffer(buf, 'fallback.mp3');
  assert.equal(meta.title, 'Glass Horizon');
  assert.equal(meta.artist, 'Amina Sol');
  assert.equal(meta.albumTitle, 'Periwinkle Sessions');
  assert.equal(meta.coverMime, 'image/png');
  assert.ok(meta.coverData && meta.coverData.byteLength === 24);
});

test('filterTracksByLibraryRules excludes short voice clips and hidden folders', () => {
  const res30 = filterTracksByLibraryRules(SAMPLE_TRACKS, 30, []);
  assert.equal(res30.visibleTracks.length, 1);
  assert.equal(res30.hiddenCount, 1);
  assert.equal(res30.visibleTracks[0].id, 't-1');

  const resFolder = filterTracksByLibraryRules(SAMPLE_TRACKS, 0, [
    'WhatsApp Audio',
    'Telegram',
  ]);
  assert.equal(resFolder.visibleTracks.length, 1);
  assert.equal(resFolder.visibleTracks[0].id, 't-1');

  const resOff = filterTracksByLibraryRules(SAMPLE_TRACKS, 0, []);
  assert.equal(resOff.visibleTracks.length, 2);
});

test('detectDefaultLanguage detects Persian (fa) and falls back to English (en)', () => {
  assert.equal(detectDefaultLanguage('fa-IR'), 'fa');
  assert.equal(detectDefaultLanguage('fa'), 'fa');
  assert.equal(detectDefaultLanguage('en-US'), 'en');
  assert.equal(detectDefaultLanguage('fr-FR'), 'en');
});

test('formatCacheSize formats bytes into readable KB/MB labels', () => {
  assert.equal(formatCacheSize(0), '0 KB');
  assert.equal(formatCacheSize(51200), '50 KB');
  assert.equal(formatCacheSize(1_572_864), '1.50 MB');
});

test('queue navigation handles repeat, shuffle, and previous threshold', () => {
  assert.equal(getNextTrackIndex(0, 5, 'off', false), 1);
  assert.equal(getNextTrackIndex(4, 5, 'all', false), 0);
  assert.equal(getNextTrackIndex(2, 5, 'one', false), 2);
  assert.equal(getNextTrackIndex(2, 5, 'off', true, () => 0.41), 3);
  assert.equal(getPrevTrackIndex(2, 5, 10), 2);
  assert.equal(getPrevTrackIndex(2, 5, 1.5), 1);
  assert.equal(getPrevTrackIndex(0, 5, 0.5), 4);
});

test('searchCatalog handles empty library and favorite filtering cleanly', () => {
  const emptyRes = searchCatalog([], [], '', 'all', false);
  assert.equal(emptyRes.tracks.length, 0);
  assert.equal(emptyRes.albums.length, 0);

  const favOnly = searchCatalog(SAMPLE_TRACKS, SAMPLE_ALBUMS, '', 'tracks', true);
  assert.equal(favOnly.tracks.length, 1);
  assert.equal(favOnly.tracks[0].id, 't-1');
});

test('buildQuickMixes & getLibraryCounts reflect local tracks accurately', () => {
  const mixes = buildQuickMixes(SAMPLE_TRACKS, SAMPLE_ALBUMS);
  assert.equal(mixes.length, 3);
  assert.equal(mixes[0].trackIds.length, 2);

  const counts = getLibraryCounts(SAMPLE_TRACKS, SAMPLE_ALBUMS);
  assert.equal(counts.files, 2);
  assert.equal(counts.favorites, 1);
  assert.equal(counts.albums, 1);
});

test('parseLrcOrPlainLyrics parses timestamped LRC and plain text lyrics', () => {
  const lrc = `
    [ti:Demo Song]
    [00:05.50] Soft rain on cedar glass
    [00:14.20] Warm needle finds the groove
  `;
  const parsedLrc = parseLrcOrPlainLyrics(lrc, 180);
  assert.equal(parsedLrc.length, 2);
  assert.equal(parsedLrc[0].time, 5.5);
  assert.equal(parsedLrc[1].time, 14.2);

  const plain = 'Line one\nLine two\nLine three';
  const parsedPlain = parseLrcOrPlainLyrics(plain, 100);
  assert.equal(parsedPlain.length, 3);
  assert.equal(parsedPlain[0].time, 0);
});

test('vinyl scratch math handles angle wrap-around and sensitivity scaling', () => {
  assert.equal(normalizeAngleDelta(175, -175), 10);
  assert.equal(normalizeAngleDelta(-175, 175), -10);
  assert.equal(angleDeltaToTimeDelta(360, 1.0), 16);
  assert.equal(angleDeltaToTimeDelta(360, 2.0), 32);
});

test('computeRefinedAccentFromRgb supports Subtle, Vibrant, and Monochrome intensities', () => {
  const vibrant = computeRefinedAccentFromRgb(220, 90, 50, undefined, 0, 'vibrant');
  const subtle = computeRefinedAccentFromRgb(220, 90, 50, undefined, 0, 'subtle');
  const mono = computeRefinedAccentFromRgb(220, 90, 50, undefined, 0, 'monochrome');

  const [, sVibrant] = rgbToHsl(...vibrant.rgb);
  const [, sSubtle] = rgbToHsl(...subtle.rgb);
  const [, sMono] = rgbToHsl(...mono.rgb);

  assert.ok(sVibrant > sSubtle);
  assert.ok(sSubtle > sMono);
  assert.ok(sMono <= 10);
  assert.ok(sVibrant <= 48);
});

test('getActiveLyricIndex and computeCarouselOffset work deterministically', () => {
  assert.equal(getActiveLyricIndex(SAMPLE_TRACKS[0].lyrics, 20), 1);
  assert.equal(computeCarouselOffset(2, 2).x, 0);
});

test('buildMediaMetadataPayload builds lock-screen metadata with extracted cover or app-icon fallback', () => {
  assert.equal(buildMediaMetadataPayload(null), null);

  const fallbackMeta = buildMediaMetadataPayload(SAMPLE_TRACKS[0]);
  assert.ok(fallbackMeta);
  assert.equal(fallbackMeta.title, 'Morning Rain');
  assert.equal(fallbackMeta.artist, 'Clara');
  assert.equal(fallbackMeta.album, 'Evening Tape');
  assert.equal(fallbackMeta.artwork[0].src, '/app-icon.svg');

  const customCoverTrack: Track = {
    ...SAMPLE_TRACKS[0],
    coverUrl: 'blob:extracted-cover',
  };
  const coverMeta = buildMediaMetadataPayload(customCoverTrack);
  assert.ok(coverMeta);
  assert.equal(coverMeta.artwork[0].src, 'blob:extracted-cover');
  assert.equal(coverMeta.artwork.length, 6);
  assert.equal(coverMeta.artwork[5].sizes, '512x512');
});

test('buildMediaPositionState clamps position and validates duration/rate for notification scrubber', () => {
  assert.equal(buildMediaPositionState(0, 10, 1), null);
  assert.equal(buildMediaPositionState(Number.NaN, 10, 1), null);

  assert.deepEqual(buildMediaPositionState(200, 42, 1.25), {
    duration: 200,
    position: 42,
    playbackRate: 1.25,
  });
  assert.deepEqual(buildMediaPositionState(200, 260, 0), {
    duration: 200,
    position: 200,
    playbackRate: 1,
  });
  assert.deepEqual(buildMediaPositionState(200, -15, 1), {
    duration: 200,
    position: 0,
    playbackRate: 1,
  });
});

test('registerMediaSessionHandlers registers all 8 Android media actions including stop and cleans up', () => {
  const registered = new Map<MediaSessionAction, MediaSessionActionHandler | null>();
  const mockSession = {
    setActionHandler(
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) {
      registered.set(action, handler);
    },
  } as unknown as MediaSession;

  const calls: string[] = [];
  const cleanup = registerMediaSessionHandlers(
    {
      onPlay: () => calls.push('play'),
      onPause: () => calls.push('pause'),
      onStop: () => calls.push('stop'),
      onPreviousTrack: () => calls.push('prev'),
      onNextTrack: () => calls.push('next'),
      onSeekTo: (t) => calls.push(`seekto:${t}`),
      onSeekBy: (d) => calls.push(`seekby:${d}`),
    },
    mockSession
  );

  const expectedActions: MediaSessionAction[] = [
    'play',
    'pause',
    'stop',
    'previoustrack',
    'nexttrack',
    'seekto',
    'seekbackward',
    'seekforward',
  ];
  for (const action of expectedActions) {
    assert.ok(typeof registered.get(action) === 'function', `Expected handler for ${action}`);
  }

  registered.get('stop')?.({ action: 'stop' });
  registered.get('seekto')?.({ action: 'seekto', seekTime: 48.5 });
  registered.get('seekbackward')?.({ action: 'seekbackward', seekOffset: 15 });
  registered.get('seekforward')?.({ action: 'seekforward' });

  assert.deepEqual(calls, ['stop', 'seekto:48.5', 'seekby:-15', 'seekby:10']);

  cleanup();
  for (const action of expectedActions) {
    assert.equal(registered.get(action), null);
  }
});

