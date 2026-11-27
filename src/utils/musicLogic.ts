import {
  Album,
  LibraryCategoryId,
  LyricLine,
  QuickMix,
  RepeatMode,
  SearchFilter,
  Track,
} from '../types/music';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseLocalFileName(fileName: string): {
  title: string;
  artist: string;
} {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
  const normalized = withoutExt.replace(/_/g, ' ').replace(/\s+/g, ' ');
  const parts = normalized.split(/\s+[-–—]\s+/);
  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }
  return {
    title: normalized || 'Untitled Pressing',
    artist: 'Local Archive',
  };
}

export function getNextTrackIndex(
  currentIndex: number,
  queueLength: number,
  repeat: RepeatMode,
  shuffle: boolean,
  randomFn: () => number = Math.random
): number {
  if (queueLength <= 0) return -1;
  if (repeat === 'one') return Math.max(0, currentIndex);
  if (shuffle && queueLength > 1) {
    let candidate = Math.floor(randomFn() * queueLength);
    if (candidate === currentIndex) {
      candidate = (currentIndex + 1) % queueLength;
    }
    return candidate;
  }
  const next = currentIndex + 1;
  if (next < queueLength) return next;
  return repeat === 'all' ? 0 : 0;
}

export function getPrevTrackIndex(
  currentIndex: number,
  queueLength: number,
  currentTime: number
): number {
  if (queueLength <= 0) return -1;
  if (currentTime > 3) return currentIndex;
  return currentIndex <= 0 ? queueLength - 1 : currentIndex - 1;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: { name: string; trackCount: number; coverUrl: string; albumTitle: string }[];
}

export function searchCatalog(
  tracks: Track[],
  albums: Album[],
  query: string,
  filter: SearchFilter,
  onlyFavorites: boolean
): SearchResults {
  const q = query.trim().toLowerCase();

  const matchingTracks = tracks.filter((t) => {
    if (onlyFavorites && !t.isFavorite) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.albumTitle.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q)
    );
  });

  const matchingAlbums = albums.filter((a) => {
    const albumTracks = tracks.filter((t) => t.albumId === a.id);
    if (onlyFavorites && !albumTracks.some((t) => t.isFavorite)) return false;
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.artist.toLowerCase().includes(q) ||
      a.genre.toLowerCase().includes(q) ||
      String(a.year).includes(q)
    );
  });

  const artistMap = new Map<
    string,
    { name: string; trackCount: number; coverUrl: string; albumTitle: string }
  >();
  for (const t of tracks) {
    if (onlyFavorites && !t.isFavorite) continue;
    const existing = artistMap.get(t.artist);
    if (existing) {
      existing.trackCount += 1;
    } else {
      artistMap.set(t.artist, {
        name: t.artist,
        trackCount: 1,
        coverUrl: t.coverUrl,
        albumTitle: t.albumTitle,
      });
    }
  }

  const matchingArtists = Array.from(artistMap.values()).filter((ar) => {
    if (!q) return true;
    return (
      ar.name.toLowerCase().includes(q) || ar.albumTitle.toLowerCase().includes(q)
    );
  });

  return {
    tracks: filter === 'all' || filter === 'tracks' ? matchingTracks : [],
    albums: filter === 'all' || filter === 'albums' ? matchingAlbums : [],
    artists: filter === 'all' || filter === 'artists' ? matchingArtists : [],
  };
}

export function buildQuickMixes(tracks: Track[], albums: Album[]): QuickMix[] {
  const favoriteAndRecent = [...tracks].sort(
    (a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.addedOrder - a.addedOrder
  );
  const albumOrder = [...albums]
    .sort((a, b) => b.addedOrder - a.addedOrder)
    .flatMap((a) => tracks.filter((t) => t.albumId === a.id));
  const decadeOrder = [...tracks].sort((a, b) => a.year - b.year);

  const uniqueCovers = (list: Track[]) =>
    Array.from(new Set(list.map((t) => t.coverUrl))).slice(0, 3);

  return [
    {
      id: 'track-mix',
      title: 'Track Mix',
      subtitle: `${favoriteAndRecent.length} curated sides`,
      trackIds: favoriteAndRecent.map((t) => t.id),
      covers: uniqueCovers(favoriteAndRecent),
    },
    {
      id: 'album-mix',
      title: 'Album Mix',
      subtitle: `${albums.length} full LPs`,
      trackIds: albumOrder.map((t) => t.id),
      covers: uniqueCovers(albumOrder),
    },
    {
      id: 'decade-mix',
      title: 'Decade Mix',
      subtitle: '2016 – 2025 pressings',
      trackIds: decadeOrder.map((t) => t.id),
      covers: uniqueCovers(decadeOrder),
    },
  ];
}

export function getLibraryCounts(
  tracks: Track[],
  albums: Album[]
): Record<LibraryCategoryId, number> {
  const artists = new Set(tracks.map((t) => t.artist));
  const genres = new Set(tracks.map((t) => t.genre));
  const playlists = new Set(tracks.map((t) => t.playlistName).filter(Boolean));
  const years = new Set(tracks.map((t) => t.year));
  const files = tracks.filter((t) => t.isLocalFile);
  const compilations = tracks.filter((t) => t.isCompilation);
  const favorites = tracks.filter((t) => t.isFavorite);

  return {
    albums: albums.length,
    artists: artists.size,
    genres: genres.size,
    tracks: tracks.length,
    playlists: playlists.size,
    files: files.length,
    compilations: compilations.length,
    years: years.size,
    favorites: favorites.length,
  };
}

export function getActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics.length) return -1;
  let active = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

export function computeCarouselOffset(
  index: number,
  activeIndex: number
): { x: number; scale: number; opacity: number; rotation: number } {
  const distance = index - activeIndex;
  const absDist = Math.abs(distance);
  // Curved vinyl arc: active item projects gently forward, neighbors tuck softly along curve
  const x = absDist === 0 ? 0 : -Math.min(42, absDist * absDist * 8 + absDist * 10);
  const scale = absDist === 0 ? 1 : Math.max(0.84, 1 - absDist * 0.065);
  const opacity = absDist === 0 ? 1 : Math.max(0.45, 1 - absDist * 0.18);
  const rotation = distance * 24;
  return { x, scale, opacity, rotation };
}
