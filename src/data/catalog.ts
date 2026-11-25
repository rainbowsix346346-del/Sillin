import { AppLanguage, AppSettings, AudioOutputDevice, EqBands } from '../types/music';

export const BOUNCY_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 24,
  mass: 0.8,
};

export const POPUP_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 26,
  mass: 0.78,
};

export function detectDefaultLanguage(navLang?: string): AppLanguage {
  const lang = (
    navLang ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en')
  ).toLowerCase();
  return lang.startsWith('fa') ? 'fa' : 'en';
}

export const DEFAULT_EXCLUDED_FOLDERS = ['WhatsApp Audio', 'Telegram'];

export const DEFAULT_SETTINGS: AppSettings = {
  language: detectDefaultLanguage(),
  languageManuallySet: false,
  nowPlayingMode: 'glass-cover',
  minTrackDurationSec: 30,
  excludedFolders: [...DEFAULT_EXCLUDED_FOLDERS],
  themeIntensity: 'vibrant',
  vinylRpm: 33,
  scratchSensitivity: 1.0,
  animationPhysics: 'bouncy',
  crossfadeSeconds: 2,
  visualizerStyle: 'bars',
};

export const EQ_PRESETS: Record<string, EqBands> = {
  Flat: { sub: 0, bass: 0, mid: 0, presence: 0, air: 0 },
  'Warm Analog': { sub: 3, bass: 4, mid: 1, presence: -1, air: 2 },
  Acoustic: { sub: 1, bass: 2, mid: 3, presence: 2, air: 4 },
  Vocal: { sub: -2, bass: 0, mid: 4, presence: 3, air: 1 },
  'Deep Bass': { sub: 6, bass: 5, mid: -1, presence: 0, air: 1 },
};

export const AUDIO_OUTPUTS: AudioOutputDevice[] = [
  {
    id: 'builtin',
    name: 'Built-in Speakers',
    type: 'speaker',
    detail: 'Balanced near-field spatial output',
  },
  {
    id: 'headphones',
    name: 'Studio Headphones',
    type: 'headphones',
    detail: 'Hi-Res lossless stereo monitoring',
  },
  {
    id: 'airplay',
    name: 'Living Room Hi-Fi',
    type: 'airplay',
    detail: 'AirPlay 2 · Bookshelf Monitors',
  },
  {
    id: 'preamp',
    name: 'Analog Line-Out',
    type: 'turntable',
    detail: 'Warm DAC reference output stage',
  },
];

/** Curated non-neon editorial sleeve palettes used only when a file has no embedded cover art */
export const SLEEVE_PALETTES: {
  hex: string;
  gradient: [string, string];
}[] = [
  { hex: '#4A558F', gradient: ['#4A558F', '#8E99C9'] },
  { hex: '#8F5C44', gradient: ['#8F5C44', '#D1A68A'] },
  { hex: '#4D6D5E', gradient: ['#4D6D5E', '#9EB5A8'] },
  { hex: '#7A536C', gradient: ['#7A536C', '#C29EB4'] },
  { hex: '#84653F', gradient: ['#84653F', '#CBB087'] },
  { hex: '#4E6B84', gradient: ['#4E6B84', '#98B2C8'] },
];

export function getSpringTransition(_physics?: AppSettings['animationPhysics']) {
  return BOUNCY_SPRING;
}
