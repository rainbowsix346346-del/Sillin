import { Track } from '../types/music';

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onSeekTo: (timeSeconds: number) => void;
  onSeekBy?: (deltaSeconds: number) => void;
}

export interface MediaArtworkEntry {
  src: string;
  sizes: string;
  type?: string;
}

export interface MediaMetadataPayload {
  title: string;
  artist: string;
  album: string;
  artwork: MediaArtworkEntry[];
}

export interface MediaPositionPayload {
  duration: number;
  playbackRate: number;
  position: number;
}

const ANDROID_ARTWORK_SIZES = [
  '96x96',
  '128x128',
  '192x192',
  '256x256',
  '384x384',
  '512x512',
] as const;

function inferImageMimeType(src: string): string | undefined {
  if (src.startsWith('data:image/png')) return 'image/png';
  if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
    return 'image/jpeg';
  }
  if (src.startsWith('data:image/webp')) return 'image/webp';
  if (src.endsWith('.svg')) return 'image/svg+xml';
  if (src.endsWith('.png')) return 'image/png';
  if (src.endsWith('.jpg') || src.endsWith('.jpeg')) return 'image/jpeg';
  if (src.endsWith('.webp')) return 'image/webp';
  return undefined;
}

/**
 * Pure helper building MediaMetadata payload for Android Notification Shade & Lock Screen.
 * Populates full standard Android artwork sizes (96px–512px) so Android dynamically tints
 * the native media notification background from the active cover art.
 */
export function buildMediaMetadataPayload(
  track: Track | null,
  fallbackArtworkUrl = '/app-icon.svg'
): MediaMetadataPayload | null {
  if (!track) return null;

  const artwork: MediaArtworkEntry[] = [];

  if (track.coverUrl) {
    const inferredType = inferImageMimeType(track.coverUrl);
    for (const sizes of ANDROID_ARTWORK_SIZES) {
      artwork.push(
        inferredType
          ? { src: track.coverUrl, sizes, type: inferredType }
          : { src: track.coverUrl, sizes }
      );
    }
  } else {
    const fallbackType = inferImageMimeType(fallbackArtworkUrl);
    artwork.push(
      fallbackType
        ? { src: fallbackArtworkUrl, sizes: '512x512', type: fallbackType }
        : { src: fallbackArtworkUrl, sizes: '512x512' }
    );
  }

  return {
    title: track.title,
    artist: track.artist,
    album: track.albumTitle,
    artwork,
  };
}

/**
 * Pure helper validating and clamping MediaSession position state for the live lock screen scrubber.
 */
export function buildMediaPositionState(
  duration: number,
  position: number,
  playbackRate: number
): MediaPositionPayload | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const safePosition = Number.isFinite(position)
    ? Math.max(0, Math.min(duration, position))
    : 0;
  const safeRate =
    Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;

  return {
    duration,
    playbackRate: safeRate,
    position: safePosition,
  };
}

/**
 * Generates a 512x512 PNG data URL from a track's palette gradient when a local file has no
 * embedded cover art, ensuring Android's native notification shade always receives a raster
 * image it can use for dynamic background tinting.
 */
function generateFallbackRasterArtwork(track: Track): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const [c1, c2] = track.fallbackGradient;
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, c1 || '#4A558F');
    grad.addColorStop(1, c2 || '#8E98C9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle soft light highlight & minimalist concentric audio emblem
    const glow = ctx.createRadialGradient(170, 150, 20, 256, 256, 320);
    glow.addColorStop(0, 'rgba(255,255,255,0.28)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 10;
    [136, 94, 52].forEach((r) => {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(256, 256, 20, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function getNavigatorMediaSession(
  customSession?: MediaSession | null
): MediaSession | null {
  if (customSession !== undefined) return customSession;
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return null;
  }
  return navigator.mediaSession;
}

export function syncMediaSessionMetadata(track: Track | null): void {
  const session = getNavigatorMediaSession();
  if (!session || typeof MediaMetadata === 'undefined') return;

  if (!track) {
    session.metadata = null;
    return;
  }

  let fallbackUrl = '/app-icon.svg';
  if (!track.coverUrl) {
    const raster = generateFallbackRasterArtwork(track);
    if (raster) fallbackUrl = raster;
  }

  const payload = buildMediaMetadataPayload(track, fallbackUrl);
  if (!payload) {
    session.metadata = null;
    return;
  }

  try {
    session.metadata = new MediaMetadata({
      title: payload.title,
      artist: payload.artist,
      album: payload.album,
      artwork: payload.artwork,
    });
  } catch {
    // Some headless or legacy runtimes reject non-absolute blob artwork URLs
  }
}

export function syncMediaSessionPlaybackState(
  isPlaying: boolean,
  hasTrack: boolean
): void {
  const session = getNavigatorMediaSession();
  if (!session) return;

  try {
    session.playbackState = !hasTrack
      ? 'none'
      : isPlaying
        ? 'playing'
        : 'paused';
  } catch {
    // Ignore unsupported playbackState environments
  }
}

export function syncMediaSessionPositionState(
  duration: number,
  position: number,
  playbackRate: number
): void {
  const session = getNavigatorMediaSession();
  if (!session || typeof session.setPositionState !== 'function') return;

  const state = buildMediaPositionState(duration, position, playbackRate);
  if (!state) return;

  try {
    session.setPositionState(state);
  } catch {
    // Ignore browsers where setPositionState throws on transient durations
  }
}

export function registerMediaSessionHandlers(
  handlers: MediaSessionHandlers,
  customSession?: MediaSession | null
): () => void {
  const session = getNavigatorMediaSession(customSession);
  if (!session || typeof session.setActionHandler !== 'function') {
    return () => {};
  }

  const actions: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
    ['play', () => handlers.onPlay()],
    ['pause', () => handlers.onPause()],
    ['stop', () => handlers.onStop()],
    ['previoustrack', () => handlers.onPreviousTrack()],
    ['nexttrack', () => handlers.onNextTrack()],
    [
      'seekto',
      (details) => {
        if (
          typeof details.seekTime === 'number' &&
          Number.isFinite(details.seekTime)
        ) {
          handlers.onSeekTo(Math.max(0, details.seekTime));
        }
      },
    ],
    [
      'seekbackward',
      (details) => {
        const offset = details.seekOffset ?? 10;
        handlers.onSeekBy?.(-offset);
      },
    ],
    [
      'seekforward',
      (details) => {
        const offset = details.seekOffset ?? 10;
        handlers.onSeekBy?.(offset);
      },
    ],
  ];

  for (const [action, handler] of actions) {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Action not supported in this browser
    }
  }

  return () => {
    for (const [action] of actions) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}
