import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';
import { AccentPalette, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { CoverArt } from './CoverArt';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  progressRatio: number;
  accentPalette: AccentPalette;
  onExpand: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onStop: () => void;
}

/**
 * Glassmorphic, Album-Colored Floating Mini-Player Pill:
 * - Translucent frosted glass with soft album-tinted ambient wash & border
 * - Strict dir="ltr" tactile spring transport controls: Previous, Play/Pause, Next, compact Stop
 * - Thin, smooth GPU-accelerated progress line running cleanly along the bottom edge
 * - Preserves shared-element Framer Motion layoutIds ("player-shell", "player-art", "player-title")
 */
export function MiniPlayer({
  track,
  isPlaying,
  progressRatio,
  accentPalette,
  onExpand,
  onPrev,
  onTogglePlay,
  onNext,
  onStop,
}: MiniPlayerProps) {
  if (!track) return null;

  const clampedProgress = Math.max(0, Math.min(1, progressRatio));

  return (
    <motion.div
      layoutId="player-shell"
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={BOUNCY_SPRING}
      className="frosted-mini-player rounded-[28px] px-2.5 py-2 flex items-center gap-2 relative overflow-hidden"
      data-testid="floating-mini-player"
      data-mini-accent={accentPalette.accent}
    >
      {/* Dynamic Album-Tinted Ambient Glass Wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 opacity-90 accent-transition"
        style={{
          background: `radial-gradient(ellipse 68% 120% at 14% 50%, ${accentPalette.auraPrimary} 0%, transparent 65%), radial-gradient(ellipse 60% 110% at 88% 50%, ${accentPalette.auraSecondary} 0%, transparent 70%)`,
        }}
      />

      {/* Clickable Track Info -> Expands into Now Playing */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Open Now Playing for ${track.title} by ${track.artist}`}
        className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1 text-start min-h-[42px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-2xl"
      >
        <motion.div
          layoutId="player-art"
          transition={BOUNCY_SPRING}
          className="relative w-10 h-10 rounded-[13px] p-[2px] bg-white/80 ring-1 ring-white/95 shrink-0 shadow-xs overflow-hidden"
        >
          <CoverArt
            src={track.coverUrl}
            alt={track.title}
            fallbackGradient={track.fallbackGradient}
            className="w-full h-full rounded-[10px]"
          />
        </motion.div>

        <div className="min-w-0 flex-1">
          <motion.span
            layoutId="player-title"
            transition={BOUNCY_SPRING}
            className="block text-[13.5px] font-semibold text-[#1D2238] truncate leading-tight"
          >
            {track.title}
          </motion.span>
          <span className="block text-[11.5px] text-[#545C7A] truncate mt-0.5 leading-tight">
            {track.artist}
          </span>
        </div>
      </button>

      {/* Strict LTR Tactile Spring Playback Controls: Previous | Play/Pause | Next | Stop */}
      <div
        dir="ltr"
        data-testid="mini-player-controls"
        className="relative z-10 flex items-center gap-0.5 sm:gap-1 shrink-0"
      >
        <motion.button
          type="button"
          data-testid="mini-btn-prev"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.84 }}
          transition={BOUNCY_SPRING}
          onClick={onPrev}
          aria-label="Previous track"
          className="w-8 h-9 sm:w-9 sm:h-9 rounded-full hover:bg-white/75 text-[#1D2238] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <SkipBack className="w-[15px] h-[15px] fill-current" />
        </motion.button>

        <motion.button
          type="button"
          data-testid="mini-btn-play"
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.85 }}
          transition={BOUNCY_SPRING}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center accent-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: `0 6px 16px -4px rgba(${accentPalette.rgb.join(',')}, 0.45)`,
          }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </motion.button>

        <motion.button
          type="button"
          data-testid="mini-btn-next"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.84 }}
          transition={BOUNCY_SPRING}
          onClick={onNext}
          aria-label="Next track"
          className="w-8 h-9 sm:w-9 sm:h-9 rounded-full hover:bg-white/75 text-[#1D2238] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <SkipForward className="w-[15px] h-[15px] fill-current" />
        </motion.button>

        <motion.button
          type="button"
          data-testid="mini-btn-stop"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.84 }}
          transition={BOUNCY_SPRING}
          onClick={onStop}
          aria-label="Stop playback"
          className="w-7 h-8 sm:w-8 sm:h-8 rounded-full bg-[#1D2238]/[0.06] hover:bg-white/80 text-[#545C7A] hover:text-[#1D2238] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Square className="w-3 h-3 fill-current rounded-[1.5px]" />
        </motion.button>
      </div>

      {/* Thin, Smooth Animated Progress Line along Bottom Edge (Strict LTR, GPU scaleX) */}
      <div
        dir="ltr"
        data-testid="mini-player-progress"
        className="absolute bottom-0 inset-x-5 h-[3px] bg-[#1D2238]/10 rounded-full overflow-hidden z-10"
        aria-hidden="true"
      >
        <div
          data-testid="mini-player-progress-fill"
          className="h-full w-full rounded-full origin-left will-change-transform transition-transform duration-150 ease-linear"
          style={{
            transform: `scaleX(${clampedProgress})`,
            background:
              'linear-gradient(90deg, var(--accent-warm) 0%, var(--accent-secondary) 52%, var(--accent) 100%)',
          }}
        />
      </div>
    </motion.div>
  );
}
