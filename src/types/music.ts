export type TabId = 'home' | 'explore' | 'library' | 'search' | 'settings';

export type RepeatMode = 'off' | 'all' | 'one';

export type SearchFilter = 'all' | 'tracks' | 'albums' | 'artists';

export type ExploreMode = 'tracks' | 'albums';

export type ThemeIntensity = 'subtle' | 'vibrant' | 'monochrome';

export type VinylRpm = 33 | 45;

export type AnimationPhysicsMode = 'standard' | 'bouncy';

export type VisualizerStyle = 'bars' | 'mirror' | 'dots';

export type NowPlayingMode = 'glass-cover' | 'turntable' | 'ambient-wave';

export type AppLanguage = 'en' | 'fa';

export type ShortClipThreshold = 0 | 30 | 60;

export interface AppSettings {
  language: AppLanguage;
  languageManuallySet: boolean;
  nowPlayingMode: NowPlayingMode;
  minTrackDurationSec: ShortClipThreshold;
  excludedFolders: string[];
  /** Kept cleanly synced for Turntable / palette engine */
  themeIntensity: ThemeIntensity;
  vinylRpm: VinylRpm;
  scratchSensitivity: number;
  animationPhysics: AnimationPhysicsMode;
  crossfadeSeconds: number;
  visualizerStyle: VisualizerStyle;
}

export type UtilitySheetTab =
  | null
  | 'sleep'
  | 'speed'
  | 'queue'
  | 'lyrics'
  | 'eq'
  | 'output';

export type LibraryCategoryId =
  | 'albums'
  | 'artists'
  | 'genres'
  | 'tracks'
  | 'playlists'
  | 'files'
  | 'compilations'
  | 'years'
  | 'favorites';

export interface LyricLine {
  time: number;
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumTitle: string;
  genre: string;
  year: number;
  duration: number; // seconds
  coverUrl: string;
  coverBytes?: number;
  fallbackGradient: [string, string];
  isFavorite: boolean;
  isCompilation?: boolean;
  isLocalFile?: boolean;
  folderPath?: string;
  playlistName?: string;
  audioUrl: string;
  lyrics: LyricLine[];
  addedOrder: number;
  moodShiftDeg?: number;
  accentSeedHex?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  coverUrl: string;
  fallbackGradient: [string, string];
  trackIds: string[];
  accentHint: string;
  addedOrder: number;
  rediscoverNote: string;
}

export interface AccentPalette {
  accent: string;
  accentDark: string;
  canvasBg: string;
  cardSurface: string;
  accentSoft: string;
  accentSecondary: string;
  accentWarm: string;
  vinylBase: string;
  vinylMid: string;
  vinylSplatter: string;
  auraPrimary: string;
  auraSecondary: string;
  rgb: [number, number, number];
  surfaceRgb: [number, number, number];
  hueName: string;
}

export interface EqBands {
  sub: number;
  bass: number;
  mid: number;
  presence: number;
  air: number;
}

export interface AudioOutputDevice {
  id: string;
  name: string;
  type: 'speaker' | 'headphones' | 'airplay' | 'turntable';
  detail: string;
}

export interface QuickMix {
  id: 'track-mix' | 'album-mix' | 'decade-mix';
  title: string;
  subtitle: string;
  trackIds: string[];
  covers: string[];
}
