import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Repeat1,
  Moon,
  Gauge,
  ListMusic,
  Quote,
  Sliders,
  Speaker,
  Disc3,
  AudioLines,
  Sparkles,
  X,
  Headphones,
  Radio,
  Check,
  FileText,
  Upload,
} from 'lucide-react';
import {
  AccentPalette,
  AppSettings,
  AudioOutputDevice,
  EqBands,
  LyricLine,
  NowPlayingMode,
  RepeatMode,
  Track,
  UtilitySheetTab,
} from '../types/music';
import {
  AUDIO_OUTPUTS,
  BOUNCY_SPRING,
  EQ_PRESETS,
  POPUP_SPRING,
} from '../data/catalog';
import { formatTime, getActiveLyricIndex } from '../utils/musicLogic';
import { parseLrcOrPlainLyrics } from '../utils/lrcParser';
import { Translations } from '../utils/i18n';
import { GlassCover } from './GlassCover';
import { Turntable } from './Turntable';
import { AmbientWave } from './AmbientWave';
import { AmbientBreathingAura } from './AmbientBreathingAura';
import { SpectrumScrubber } from './SpectrumScrubber';
import { CoverArt } from './CoverArt';
import { LiveEqualizerBars } from './LiveEqualizerBars';
import { FavoriteHeartButton } from './FavoriteHeartButton';

interface NowPlayingSheetProps {
  isOpen: boolean;
  track: Track | null;
  trackDirection: 1 | -1;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
  sleepMinutesLeft: number | null;
  eqBands: EqBands;
  outputId: string;
  accentPalette: AccentPalette;
  settings: AppSettings;
  t: Translations;
  onClose: () => void;
  onChangeMode: (mode: NowPlayingMode) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  onSelectTrack: (track: Track) => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onChangeEq: (bands: EqBands) => void;
  onSelectOutput: (outputId: string) => void;
  onUpdateTrackLyrics: (trackId: string, lyrics: LyricLine[]) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];
const SLEEP_OPTIONS: { labelKey?: 'sleepOff'; label?: string; value: number | null }[] = [
  { labelKey: 'sleepOff', value: null },
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
];

const TRACK_CAROUSEL_VARIANTS = {
  enter: (dir: 1 | -1) => ({
    x: dir * 110,
    rotate: dir * 8,
    scale: 0.86,
    opacity: 0,
  }),
  center: {
    x: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
  },
  exit: (dir: 1 | -1) => ({
    x: dir * -115,
    rotate: dir * -8,
    scale: 0.82,
    opacity: 0,
    transition: { duration: 0.24, ease: [0.32, 0, 0.24, 1] as const },
  }),
};

const TITLE_CROSS_VARIANTS = {
  enter: (dir: 1 | -1) => ({
    x: dir * 26,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 1 | -1) => ({
    x: dir * -22,
    opacity: 0,
    transition: { duration: 0.14, ease: 'easeIn' as const },
  }),
};

export function NowPlayingSheet({
  isOpen,
  track,
  trackDirection,
  queue,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeat,
  playbackRate,
  sleepMinutesLeft,
  eqBands,
  outputId,
  accentPalette,
  settings,
  t,
  onClose,
  onChangeMode,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onSelectTrack,
  onSetPlaybackRate,
  onSetSleepTimer,
  onChangeEq,
  onSelectOutput,
  onUpdateTrackLyrics,
}: NowPlayingSheetProps) {
  const [activeUtility, setActiveUtility] = useState<UtilitySheetTab>(null);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState('');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const lrcFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsStageRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);

  const stageMode = settings.nowPlayingMode;
  const activeLyricIdx = track
    ? getActiveLyricIndex(track.lyrics, currentTime)
    : -1;

  // Scroll strictly inside the lyrics container only (never scrolls outer Now Playing viewport)
  useEffect(() => {
    if (
      activeUtility === 'lyrics' &&
      !isEditingLyrics &&
      activeLyricRef.current &&
      lyricsStageRef.current
    ) {
      const container = lyricsStageRef.current;
      const lineEl = activeLyricRef.current;
      const targetTop =
        lineEl.offsetTop -
        container.clientHeight / 2 +
        lineEl.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }
  }, [activeLyricIdx, activeUtility, isEditingLyrics]);

  if (!track) return null;

  const handleSaveLyricsDraft = () => {
    const parsed = parseLrcOrPlainLyrics(lyricsDraft, duration);
    onUpdateTrackLyrics(track.id, parsed);
    setIsEditingLyrics(false);
    setLyricsDraft('');
  };

  const handleImportLrcFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseLrcOrPlainLyrics(text, duration);
    if (parsed.length > 0) {
      onUpdateTrackLyrics(track.id, parsed);
      setIsEditingLyrics(false);
      setLyricsDraft('');
    }
  };

  const modeTabs: { id: NowPlayingMode; label: string; icon: typeof Sparkles }[] = [
    { id: 'glass-cover', label: t.modeGlassCover, icon: Sparkles },
    { id: 'turntable', label: t.modeTurntable, icon: Disc3 },
    { id: 'ambient-wave', label: t.modeAmbientWave, icon: AudioLines },
  ];

  const utilityButtons: {
    id: Exclude<UtilitySheetTab, null>;
    label: string;
    icon: typeof Moon;
    badge?: string;
  }[] = [
    {
      id: 'sleep',
      label: t.utilSleep,
      icon: Moon,
      badge: sleepMinutesLeft !== null ? `${sleepMinutesLeft}m` : undefined,
    },
    {
      id: 'speed',
      label: t.utilSpeed,
      icon: Gauge,
      badge: playbackRate !== 1 ? `${playbackRate}x` : undefined,
    },
    { id: 'queue', label: t.utilQueue, icon: ListMusic },
    { id: 'lyrics', label: t.utilLyrics, icon: Quote },
    { id: 'eq', label: t.utilEq, icon: Sliders },
    { id: 'output', label: t.utilOutput, icon: Speaker },
  ];

  const getOutputIcon = (type: AudioOutputDevice['type']) => {
    switch (type) {
      case 'headphones':
        return Headphones;
      case 'airplay':
        return Radio;
      case 'turntable':
        return Disc3;
      default:
        return Speaker;
    }
  };

  const utilityTitle =
    activeUtility === 'eq'
      ? t.eqTitle
      : activeUtility === 'output'
        ? t.outputTitle
        : activeUtility === 'sleep'
          ? t.sleepTitle
          : activeUtility === 'speed'
            ? t.speedTitle
            : activeUtility === 'queue'
              ? t.queueTitle
              : t.lyricsTitle;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layoutId="player-shell"
          role="dialog"
          aria-modal="true"
          aria-label="Now Playing"
          data-testid="now-playing-sheet"
          transition={BOUNCY_SPRING}
          className="fixed inset-0 z-50 h-[100dvh] overflow-hidden flex flex-col accent-transition"
          style={{
            background: `linear-gradient(180deg, ${accentPalette.accentSoft} 0%, ${accentPalette.canvasBg} 44%, ${accentPalette.cardSurface} 100%)`,
          }}
        >
          <input
            ref={lrcFileInputRef}
            type="file"
            accept=".lrc,.txt,text/plain"
            className="hidden"
            aria-label="Import LRC or text lyrics file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleImportLrcFile(file);
                e.target.value = '';
              }
            }}
          />

          {/* Multi-Layered Bass-Reactive Ambient Breathing Aura behind Centerpiece */}
          <AmbientBreathingAura palette={accentPalette} isPlaying={isPlaying} />

          {/* Fixed-viewport 100dvh inner flex column: zero vertical scroll required */}
          <div className="relative z-10 w-full max-w-xl mx-auto flex-1 min-h-0 flex flex-col justify-between px-3 sm:px-7 pt-2.5 pb-4 sm:pb-5 gap-2">
            {/* 1. Top Bar with 3-Way Spring Mode Switcher */}
            <div className="shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#1D2238]/15 mx-auto mb-2" />
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    setActiveUtility(null);
                    onClose();
                  }}
                  aria-label="Collapse Now Playing sheet"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-[#1D2238] flex items-center justify-center shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.button>

                {/* 3-Way Segmented Pill Switcher: Glass Cover / Turntable / Ambient Wave */}
                <div
                  role="tablist"
                  aria-label="Now Playing visual mode"
                  data-testid="now-playing-mode-switcher"
                  className="inline-flex items-center p-1 rounded-full bg-white/80 shadow-xs shrink min-w-0"
                >
                  {modeTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = stageMode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChangeMode(tab.id)}
                        className={`relative min-h-[34px] px-2 sm:px-3.5 py-1 rounded-full text-[10.5px] sm:text-xs font-semibold inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                          active
                            ? 'text-white'
                            : 'text-[#545C7A] hover:text-[#1D2238]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="stage-mode-pill"
                            transition={BOUNCY_SPRING}
                            className="absolute inset-0 rounded-full accent-transition"
                            style={{ backgroundColor: 'var(--accent)' }}
                          />
                        )}
                        <Icon
                          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0 ${
                            active ? 'inline-block' : 'hidden sm:inline-block'
                          }`}
                        />
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <FavoriteHeartButton
                  isFavorite={track.isFavorite}
                  size="md"
                  testId="now-playing-heart-btn"
                  ariaLabel={
                    track.isFavorite
                      ? `Remove ${track.title} from favorites`
                      : `Add ${track.title} to favorites`
                  }
                  onToggle={() => onToggleFavorite(track.id)}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-white/80 hover:bg-white shadow-xs shrink-0"
                />
              </div>
            </div>

            {/* 2. Centerpiece Stage with Cinematic Spring Track-Carousel & Swipe Gesture */}
            <div
              className="flex-1 min-h-0 flex items-center justify-center py-1 relative overflow-visible"
              onPointerDown={(e) => {
                if (stageMode === 'turntable') return;
                swipeStartRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!swipeStartRef.current || stageMode === 'turntable') return;
                const dx = e.clientX - swipeStartRef.current.x;
                const dy = e.clientY - swipeStartRef.current.y;
                if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.15) {
                  setSwipeOffset(Math.max(-90, Math.min(90, dx * 0.65)));
                }
              }}
              onPointerUp={(e) => {
                if (!swipeStartRef.current || stageMode === 'turntable') return;
                const dx = e.clientX - swipeStartRef.current.x;
                const dy = e.clientY - swipeStartRef.current.y;
                swipeStartRef.current = null;
                setSwipeOffset(0);
                if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                  if (dx < 0) onNext();
                  else onPrev();
                }
              }}
              onPointerCancel={() => {
                swipeStartRef.current = null;
                setSwipeOffset(0);
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {stageMode === 'glass-cover' && (
                  <motion.div
                    key="glass-cover-mode"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                    transition={BOUNCY_SPRING}
                    className="w-full flex items-center justify-center relative"
                  >
                    <AnimatePresence
                      mode="popLayout"
                      custom={trackDirection}
                      initial={false}
                    >
                      <motion.div
                        key={`glass-track-${track.id}`}
                        custom={trackDirection}
                        variants={TRACK_CAROUSEL_VARIANTS}
                        initial="enter"
                        animate={{
                          ...TRACK_CAROUSEL_VARIANTS.center,
                          x: swipeOffset,
                          rotate: swipeOffset * 0.08,
                        }}
                        exit="exit"
                        transition={BOUNCY_SPRING}
                        data-testid="track-carousel-card"
                        className="w-full flex items-center justify-center will-change-transform"
                      >
                        <GlassCover
                          track={track}
                          palette={accentPalette}
                          isPlaying={isPlaying}
                          tiltHint={t.tiltHint}
                          onTogglePlay={onTogglePlay}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {stageMode === 'turntable' && (
                  <motion.div
                    key="turntable-mode"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                    transition={BOUNCY_SPRING}
                    className="w-full max-w-[290px] sm:max-w-[320px] flex items-center justify-center relative"
                  >
                    <AnimatePresence
                      mode="popLayout"
                      custom={trackDirection}
                      initial={false}
                    >
                      <motion.div
                        key={`turntable-track-${track.id}`}
                        custom={trackDirection}
                        variants={TRACK_CAROUSEL_VARIANTS}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={BOUNCY_SPRING}
                        className="w-full flex items-center justify-center will-change-transform"
                      >
                        <Turntable
                          track={track}
                          palette={accentPalette}
                          isPlaying={isPlaying}
                          playbackRate={playbackRate}
                          vinylRpm={settings.vinylRpm}
                          scratchSensitivity={settings.scratchSensitivity}
                          physics="bouncy"
                          currentTime={currentTime}
                          duration={duration}
                          onTogglePlay={onTogglePlay}
                          onScrubTime={onSeek}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {stageMode === 'ambient-wave' && (
                  <motion.div
                    key="ambient-wave-mode"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                    transition={BOUNCY_SPRING}
                    className="w-full flex items-center justify-center relative"
                  >
                    <AnimatePresence
                      mode="popLayout"
                      custom={trackDirection}
                      initial={false}
                    >
                      <motion.div
                        key={`wave-track-${track.id}`}
                        custom={trackDirection}
                        variants={TRACK_CAROUSEL_VARIANTS}
                        initial="enter"
                        animate={{
                          ...TRACK_CAROUSEL_VARIANTS.center,
                          x: swipeOffset,
                          rotate: swipeOffset * 0.06,
                        }}
                        exit="exit"
                        transition={BOUNCY_SPRING}
                        className="w-full flex items-center justify-center will-change-transform"
                      >
                        <AmbientWave
                          track={track}
                          palette={accentPalette}
                          isPlaying={isPlaying}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Synchronized Cross-Sliding Track Title, Elastic Scrubber, Transport & Utility Dock */}
            <div className="shrink-0 space-y-2.5 sm:space-y-3 relative">
              <div className="text-center px-2 overflow-hidden min-h-[48px] flex items-center justify-center">
                <AnimatePresence
                  mode="wait"
                  custom={trackDirection}
                  initial={false}
                >
                  <motion.div
                    key={`title-${track.id}`}
                    custom={trackDirection}
                    variants={TITLE_CROSS_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={BOUNCY_SPRING}
                    className="w-full space-y-0.5 will-change-transform"
                  >
                    <h2
                      data-testid="now-playing-title"
                      className="font-serif text-xl sm:text-2xl font-semibold text-[#1D2238] leading-tight truncate"
                    >
                      {track.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#545C7A] truncate">
                      {track.artist} · {track.albumTitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Strict LTR Wrapper for Progress Bar & Playback Controls (never reversed in Persian RTL) */}
              <div
                dir="ltr"
                data-testid="now-playing-ltr-controls"
                className="space-y-2.5 sm:space-y-3"
              >
                <SpectrumScrubber
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  expanded={false}
                  visualizerStyle={settings.visualizerStyle}
                  onSeek={onSeek}
                />

                {/* Transport Controls: Shuffle (far left) · Prev (left) · Play/Pause (center) · Next (right) · Repeat (far right) */}
                <div
                  dir="ltr"
                  data-testid="transport-controls-row"
                  className="flex items-center justify-center gap-3 sm:gap-5"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.84 }}
                    transition={BOUNCY_SPRING}
                    onClick={onToggleShuffle}
                    aria-label="Toggle shuffle"
                    aria-pressed={shuffle}
                    data-testid="transport-btn-shuffle"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      backgroundColor: shuffle
                        ? 'var(--accent-tint)'
                        : 'transparent',
                      color: shuffle ? 'var(--accent)' : '#545C7A',
                    }}
                  >
                    <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.07 }}
                    whileTap={{ scale: 0.84 }}
                    transition={BOUNCY_SPRING}
                    onClick={onPrev}
                    aria-label="Previous track"
                    data-testid="transport-btn-prev"
                    className="w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-white text-[#1D2238] flex items-center justify-center shadow-xs accent-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.86 }}
                    transition={BOUNCY_SPRING}
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                    data-testid="transport-btn-play"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white flex items-center justify-center accent-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 14px 28px -8px rgba(var(--accent-rgb), 0.55)',
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5" />
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.07 }}
                    whileTap={{ scale: 0.84 }}
                    transition={BOUNCY_SPRING}
                    onClick={onNext}
                    aria-label="Next track"
                    data-testid="transport-btn-next"
                    className="w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-white text-[#1D2238] flex items-center justify-center shadow-xs accent-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.84 }}
                    transition={BOUNCY_SPRING}
                    onClick={onCycleRepeat}
                    aria-label={`Repeat mode: ${repeat}`}
                    data-testid="transport-btn-repeat"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      backgroundColor:
                        repeat !== 'off' ? 'var(--accent-tint)' : 'transparent',
                      color: repeat !== 'off' ? 'var(--accent)' : '#545C7A',
                    }}
                  >
                    {repeat === 'one' ? (
                      <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Pinned Bottom 6-Button Utility Dock (ALWAYS visible, zero scroll!) */}
              <div
                role="toolbar"
                aria-label="Player utilities"
                data-testid="now-playing-utility-dock"
                className="relative z-40 grid grid-cols-6 gap-1 p-1.5 rounded-[22px] bg-white/75 ring-1 ring-white/85 shadow-xs"
              >
                {utilityButtons.map((btn) => {
                  const Icon = btn.icon;
                  const active = activeUtility === btn.id;
                  return (
                    <motion.button
                      key={btn.id}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      transition={BOUNCY_SPRING}
                      onClick={() => {
                        setActiveUtility(active ? null : btn.id);
                        setIsEditingLyrics(false);
                      }}
                      aria-pressed={active}
                      data-testid={`utility-btn-${btn.id}`}
                      className={`relative min-h-[50px] rounded-[16px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        active
                          ? 'text-white'
                          : 'text-[#545C7A] hover:bg-white/60 hover:text-[#1D2238]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="utility-dock-active-pill"
                          transition={BOUNCY_SPRING}
                          className="absolute inset-0 rounded-[16px] accent-transition"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                      <Icon className="w-4 h-4 relative z-10" />
                      <span className="text-[10px] font-semibold tracking-tight relative z-10 truncate max-w-full px-0.5">
                        {btn.badge || btn.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Instant No-Scroll Floating Frosted-Glass Utility Overlay Modal anchored right above Utility Dock */}
            <AnimatePresence>
              {activeUtility && (
                <>
                  {/* Subtle tap-outside dismiss scrim */}
                  <motion.div
                    key="utility-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => {
                      setActiveUtility(null);
                      setIsEditingLyrics(false);
                    }}
                    className="fixed inset-0 z-20 bg-[#1D2238]/12"
                    aria-hidden="true"
                  />

                  <motion.div
                    key={`utility-popup-${activeUtility}`}
                    data-testid="utility-popup-overlay"
                    initial={{ opacity: 0, y: 24, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.95 }}
                    transition={POPUP_SPRING}
                    className="absolute inset-x-4 sm:inset-x-7 bottom-[78px] sm:bottom-[84px] z-30 frosted-modal rounded-[26px] p-4 sm:p-5 ring-1 ring-white/90 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold text-[#1D2238]">
                        {utilityTitle}
                      </h3>

                      <div className="flex items-center gap-1.5">
                        {activeUtility === 'lyrics' && (
                          <>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => lrcFileInputRef.current?.click()}
                              className="min-h-[34px] px-3 rounded-full bg-white/85 hover:bg-white text-xs font-semibold text-[#1D2238] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{t.importLrc}</span>
                            </motion.button>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => {
                                if (!isEditingLyrics) {
                                  const existing = track.lyrics
                                    .map(
                                      (l) =>
                                        `[${formatTime(l.time).padStart(5, '0')}] ${l.text}`
                                    )
                                    .join('\n');
                                  setLyricsDraft(existing);
                                }
                                setIsEditingLyrics((v) => !v);
                              }}
                              className="min-h-[34px] px-3 rounded-full bg-white/85 hover:bg-white text-xs font-semibold text-[#1D2238] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>
                                {isEditingLyrics ? t.viewLyrics : t.pasteLyrics}
                              </span>
                            </motion.button>
                          </>
                        )}

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            setActiveUtility(null);
                            setIsEditingLyrics(false);
                          }}
                          aria-label="Close utility panel"
                          className="w-9 h-9 rounded-full bg-white/75 hover:bg-white flex items-center justify-center text-[#545C7A] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Sleep Timer */}
                    {activeUtility === 'sleep' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {SLEEP_OPTIONS.map((opt) => {
                            const selected = sleepMinutesLeft === opt.value;
                            return (
                              <motion.button
                                key={opt.labelKey ?? opt.label}
                                type="button"
                                whileTap={{ scale: 0.9 }}
                                transition={BOUNCY_SPRING}
                                onClick={() => onSetSleepTimer(opt.value)}
                                className={`min-h-[42px] px-4 rounded-full text-xs sm:text-sm font-semibold cursor-pointer transition-colors duration-150 ${
                                  selected
                                    ? 'text-white shadow-sm'
                                    : 'bg-white/80 text-[#545C7A] hover:text-[#1D2238]'
                                }`}
                                style={
                                  selected
                                    ? { backgroundColor: 'var(--accent)' }
                                    : undefined
                                }
                              >
                                {opt.labelKey ? t[opt.labelKey] : opt.label}
                              </motion.button>
                            );
                          })}
                        </div>
                        {sleepMinutesLeft !== null && (
                          <p className="text-xs font-medium text-[#545C7A] tabular-nums">
                            {sleepMinutesLeft} {t.sleepRemaining}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Playback Speed */}
                    {activeUtility === 'speed' && (
                      <div className="flex flex-wrap gap-2">
                        {SPEED_OPTIONS.map((rate) => {
                          const selected = playbackRate === rate;
                          return (
                            <motion.button
                              key={rate}
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              transition={BOUNCY_SPRING}
                              onClick={() => onSetPlaybackRate(rate)}
                              className={`min-h-[42px] px-4 rounded-full text-sm font-semibold tabular-nums cursor-pointer transition-colors duration-150 ${
                                selected
                                  ? 'text-white shadow-sm'
                                  : 'bg-white/80 text-[#545C7A] hover:text-[#1D2238]'
                              }`}
                              style={
                                selected
                                  ? { backgroundColor: 'var(--accent)' }
                                  : undefined
                              }
                            >
                              {rate}x
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Up Next Queue with Staggered Spring Entrance, Scroll Viewport Fade & Live 3-Bar Equalizer */}
                    {activeUtility === 'queue' && (
                      <div className="max-h-[40dvh] overflow-y-auto space-y-1.5 pe-1 no-scrollbar">
                        {queue.map((item, idx) => {
                          const current = item.id === track.id;
                          return (
                            <motion.button
                              key={item.id}
                              type="button"
                              initial={{ opacity: 0, y: 12, scale: 0.96 }}
                              whileInView={{ opacity: 1, y: 0, scale: 1 }}
                              viewport={{ once: false, amount: 0.15 }}
                              transition={{
                                ...BOUNCY_SPRING,
                                delay: Math.min(idx, 8) * 0.03,
                              }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => onSelectTrack(item)}
                              className={`w-full flex items-center gap-3 p-2 rounded-2xl text-start transition-colors cursor-pointer min-h-[52px] will-change-transform ${
                                current ? 'bg-white shadow-xs' : 'hover:bg-white/65'
                              }`}
                            >
                              <CoverArt
                                src={item.coverUrl}
                                alt={item.title}
                                fallbackGradient={item.fallbackGradient}
                                className="w-10 h-10 rounded-[12px] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="block text-sm font-semibold truncate"
                                    style={{
                                      color: current ? 'var(--accent)' : '#1D2238',
                                    }}
                                  >
                                    {item.title}
                                  </span>
                                  {current && (
                                    <LiveEqualizerBars isPlaying={isPlaying} />
                                  )}
                                </span>
                                <span className="block text-xs text-[#545C7A] truncate">
                                  {item.artist}
                                </span>
                              </div>
                              <span className="text-xs text-[#7C84A3] tabular-nums shrink-0">
                                {formatTime(item.duration)}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Apple Music-Style Fluid Lyrics */}
                    {activeUtility === 'lyrics' && (
                      <div data-testid="fluid-lyrics-panel">
                        {isEditingLyrics ? (
                          <div className="space-y-3">
                            <label
                              htmlFor="lyrics-paste-box"
                              className="block text-xs text-[#545C7A]"
                            >
                              {t.lyricsHelp}
                            </label>
                            <textarea
                              id="lyrics-paste-box"
                              rows={4}
                              value={lyricsDraft}
                              onChange={(e) => setLyricsDraft(e.target.value)}
                              placeholder={'[00:00.00] First lyric line\n[00:12.50] Second lyric line'}
                              className="w-full rounded-2xl bg-white/90 p-3 text-sm text-[#1D2238] placeholder:text-[#7C84A3] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingLyrics(false)}
                                className="min-h-[38px] px-4 rounded-full bg-white/80 text-xs font-semibold text-[#545C7A] cursor-pointer"
                              >
                                {t.cancel}
                              </button>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                onClick={handleSaveLyricsDraft}
                                className="min-h-[38px] px-4 rounded-full text-xs font-semibold text-white cursor-pointer accent-transition"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                {t.saveLyrics}
                              </motion.button>
                            </div>
                          </div>
                        ) : track.lyrics.length === 0 ? (
                          <div className="py-4 text-center space-y-3">
                            <p className="text-sm text-[#545C7A]">
                              {t.noLyricsYet}
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.94 }}
                                onClick={() => lrcFileInputRef.current?.click()}
                                className="min-h-[40px] px-4 rounded-full bg-white text-xs font-semibold text-[#1D2238] shadow-xs cursor-pointer"
                              >
                                {t.importLrc}
                              </motion.button>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setIsEditingLyrics(true)}
                                className="min-h-[40px] px-4 rounded-full text-xs font-semibold text-white cursor-pointer accent-transition"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                {t.pasteLyrics}
                              </motion.button>
                            </div>
                          </div>
                        ) : (
                          <div
                            ref={lyricsStageRef}
                            data-testid="fluid-lyrics-stage"
                            className="max-h-[36dvh] overflow-y-auto px-2 py-5 space-y-3 no-scrollbar"
                          >
                            {track.lyrics.map((line, idx) => {
                              const active = idx === activeLyricIdx;
                              const distance = Math.abs(idx - activeLyricIdx);
                              return (
                                <motion.button
                                  key={`${line.time}-${idx}`}
                                  ref={active ? activeLyricRef : null}
                                  type="button"
                                  onClick={() => onSeek(line.time)}
                                  animate={{
                                    scale: active ? 1.04 : 0.96,
                                    opacity: active
                                      ? 1
                                      : Math.max(0.32, 0.58 - distance * 0.08),
                                  }}
                                  transition={BOUNCY_SPRING}
                                  data-active-lyric={active ? 'true' : 'false'}
                                  className={`block w-full text-start font-serif origin-left cursor-pointer py-1 transition-[filter,color] duration-500 ${
                                    active
                                      ? 'text-lg sm:text-xl font-semibold blur-0'
                                      : 'text-sm sm:text-base text-[#545C7A] blur-[1.4px] hover:blur-0 hover:opacity-90'
                                  }`}
                                  style={
                                    active
                                      ? { color: 'var(--accent)' }
                                      : undefined
                                  }
                                >
                                  {line.text}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5-Band Equalizer */}
                    {activeUtility === 'eq' && (
                      <div className="space-y-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(EQ_PRESETS).map(([name, preset]) => (
                            <motion.button
                              key={name}
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => onChangeEq(preset)}
                              className="min-h-[34px] px-3 rounded-full bg-white/85 hover:bg-white text-xs font-medium text-[#1D2238] cursor-pointer"
                            >
                              {name}
                            </motion.button>
                          ))}
                        </div>
                        <div className="grid grid-cols-5 gap-2.5">
                          {(
                            [
                              ['sub', '60Hz'],
                              ['bass', '230Hz'],
                              ['mid', '910Hz'],
                              ['presence', '3.6k'],
                              ['air', '14k'],
                            ] as [keyof EqBands, string][]
                          ).map(([band, label]) => (
                            <div
                              key={band}
                              className="flex flex-col items-center gap-1"
                            >
                              <span className="text-[11px] font-semibold text-[#545C7A] tabular-nums">
                                {eqBands[band] > 0
                                  ? `+${eqBands[band]}`
                                  : eqBands[band]}
                              </span>
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                step={1}
                                value={eqBands[band]}
                                aria-label={`Equalizer ${label}`}
                                onChange={(e) =>
                                  onChangeEq({
                                    ...eqBands,
                                    [band]: Number(e.target.value),
                                  })
                                }
                                className="tactile-slider w-full"
                              />
                              <span className="text-[10px] text-[#7C84A3] font-medium">
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Output */}
                    {activeUtility === 'output' && (
                      <div className="space-y-1.5">
                        {AUDIO_OUTPUTS.map((dev) => {
                          const DevIcon = getOutputIcon(dev.type);
                          const selected = outputId === dev.id;
                          return (
                            <motion.button
                              key={dev.id}
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => onSelectOutput(dev.id)}
                              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-start transition-colors cursor-pointer min-h-[50px] ${
                                selected
                                  ? 'bg-white shadow-xs'
                                  : 'hover:bg-white/65'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <DevIcon
                                  className="w-5 h-5 shrink-0"
                                  style={{
                                    color: selected
                                      ? 'var(--accent)'
                                      : '#545C7A',
                                  }}
                                />
                                <div className="min-w-0">
                                  <span className="block text-sm font-semibold text-[#1D2238] truncate">
                                    {dev.name}
                                  </span>
                                  <span className="block text-xs text-[#545C7A] truncate">
                                    {dev.detail}
                                  </span>
                                </div>
                              </div>
                              {selected && (
                                <Check
                                  className="w-4 h-4 shrink-0"
                                  style={{ color: 'var(--accent)' }}
                                />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
