import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VisualizerStyle } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { vinylAudioEngine } from '../audio/audioEngine';
import { formatTime } from '../utils/musicLogic';

interface SpectrumScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  expanded: boolean;
  visualizerStyle?: VisualizerStyle;
  onSeek: (timeSeconds: number) => void;
}

/**
 * Modern Fluid Glass Progress Scrubber (strictly LTR, 60fps GPU-only):
 * - Smooth rounded glass track (6px idle -> 10px expanded via GPU scaleY spring bounce)
 * - Dynamic shifting album-art gradient fill with a subtle beat-synced traveling shimmer
 * - Tactile pill thumb with bass-reactive ambient edge halo
 * - Floating frosted-glass time tooltip right above the finger while scrubbing
 * - Strict dir="ltr" ensures left-to-right fill and clean `-1:28` remaining time even in Persian RTL
 */
export function SpectrumScrubber({
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: SpectrumScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const [draggingRatio, setDraggingRatio] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  const safeDuration = Math.max(1, duration);
  const isDragging = draggingRatio !== null;
  const effectiveRatio = isDragging
    ? draggingRatio
    : Math.max(0, Math.min(1, currentTime / safeDuration));

  // Throttled 60fps GPU-only beat shimmer & bass-reactive thumb halo
  useEffect(() => {
    let rafId = 0;
    let lastFrame = 0;
    let shimmerPos = -40;
    let smoothBass = 0.14;

    const animate = (now: number) => {
      if (now - lastFrame >= 16) {
        const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
        lastFrame = now;

        const rawBass = isPlaying ? vinylAudioEngine.getBassEnergy() : 0.04;
        const breathe = isPlaying ? (Math.sin(now * 0.005) + 1) * 0.12 : 0;
        const target = Math.min(1, rawBass + breathe);
        smoothBass += (target - smoothBass) * 0.18;

        // Traveling luminous shimmer along the filled gradient bar
        shimmerPos += dt * (isPlaying ? 58 + smoothBass * 55 : 14);
        if (shimmerPos > 140) shimmerPos = -45;

        if (shimmerRef.current) {
          shimmerRef.current.style.transform = `translate3d(${shimmerPos.toFixed(1)}%, 0, 0)`;
          shimmerRef.current.style.opacity = (
            isPlaying ? 0.32 + smoothBass * 0.36 : 0.12
          ).toFixed(3);
        }

        if (haloRef.current) {
          const haloScale = 0.9 + smoothBass * 0.85;
          const haloOpacity = isPlaying ? 0.24 + smoothBass * 0.32 : 0.08;
          haloRef.current.style.transform = `scale(${haloScale.toFixed(3)})`;
          haloRef.current.style.opacity = haloOpacity.toFixed(3);
        }
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const computeRatioFromClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer event
    }
    const ratio = computeRatioFromClientX(e.clientX);
    setDraggingRatio(ratio);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = computeRatioFromClientX(e.clientX);
    setHoverRatio(ratio);
    if (draggingRatio !== null) {
      setDraggingRatio(ratio);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRatio !== null) {
      const ratio = computeRatioFromClientX(e.clientX);
      onSeek(ratio * safeDuration);
      setDraggingRatio(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(safeDuration, currentTime + 5));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    }
  };

  const tooltipRatio = isDragging ? draggingRatio : hoverRatio;
  const clampedPercent = Math.max(0, Math.min(100, effectiveRatio * 100));
  const elapsedSeconds = effectiveRatio * safeDuration;
  const remainingSeconds = Math.max(0, safeDuration - elapsedSeconds);

  return (
    <div dir="ltr" className="w-full space-y-2 pt-6 select-none">
      {/* Interactive Touch Hit Target (44px accessible height) */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Track playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(elapsedSeconds)}
        aria-valuetext={`${formatTime(elapsedSeconds)} of ${formatTime(safeDuration)}`}
        data-testid="spectrum-scrubber"
        data-dragging={isDragging ? 'true' : 'false'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDraggingRatio(null)}
        onPointerLeave={() => {
          setHoverRatio(null);
          if (draggingRatio !== null) {
            onSeek(draggingRatio * safeDuration);
            setDraggingRatio(null);
          }
        }}
        onKeyDown={handleKeyDown}
        className="relative w-full h-9 flex items-center cursor-pointer touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full"
      >
        {/* Floating Frosted-Glass Time Tooltip above finger while scrubbing */}
        <AnimatePresence>
          {tooltipRatio !== null && (
            <motion.div
              key="scrubber-time-pill"
              data-testid="scrubber-time-pill"
              initial={{ opacity: 0, y: 6, scale: 0.78 }}
              animate={{
                opacity: 1,
                y: isDragging ? -2 : 0,
                scale: isDragging ? 1.04 : 1,
              }}
              exit={{ opacity: 0, y: 5, scale: 0.82 }}
              transition={BOUNCY_SPRING}
              className="pointer-events-none absolute -top-6 z-30 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums bg-white/95 backdrop-blur-md text-[#1D2238] ring-1 ring-[#1D2238]/10 shadow-[0_6px_18px_rgba(29,34,56,0.14)] will-change-transform"
              style={{
                left: `${Math.max(10, Math.min(90, tooltipRatio * 100))}%`,
              }}
            >
              <span style={{ color: 'var(--accent-dark)' }}>
                {formatTime(tooltipRatio * safeDuration)}
              </span>
              <span
                className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-white/95 border-r border-b border-[#1D2238]/8"
                aria-hidden="true"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smooth Rounded Glass Track: 6px idle -> 10px expanded with spring bounce (GPU scaleY) */}
        <motion.div
          data-testid="scrubber-glass-track"
          animate={{
            scaleY: isDragging ? 1.67 : hoverRatio !== null ? 1.25 : 1,
          }}
          transition={BOUNCY_SPRING}
          className="relative w-full h-[6px] rounded-full bg-[#1D2238]/10 ring-1 ring-white/75 overflow-hidden will-change-transform"
        >
          {/* Dynamic Shifting Album-Art Gradient Fill (fills strictly Left -> Right) */}
          <div
            data-testid="scrubber-filled-bar"
            className="absolute inset-y-0 left-0 w-full rounded-full origin-left will-change-transform overflow-hidden"
            style={{
              transform: `scaleX(${Math.max(0.008, effectiveRatio)})`,
              background:
                'linear-gradient(90deg, var(--accent-warm) 0%, var(--accent-secondary) 48%, var(--accent) 100%)',
            }}
          >
            {/* Living Beat-Synced Shimmer Pulse traveling across the filled track */}
            <span
              ref={shimmerRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[42%] rounded-full will-change-transform"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.68) 50%, transparent 100%)',
              }}
            />
          </div>
        </motion.div>

        {/* Tactile Pill Thumb + Audio-Reactive Soft Halo at Active Progress Edge */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          style={{ left: `${clampedPercent}%` }}
        >
          <span
            ref={haloRef}
            data-testid="scrubber-edge-ripple"
            className="absolute w-8 h-8 rounded-full will-change-transform"
            style={{
              background:
                'radial-gradient(circle, rgba(var(--accent-rgb), 0.38) 0%, rgba(var(--accent-rgb), 0) 72%)',
              opacity: isPlaying ? 0.32 : 0.08,
            }}
            aria-hidden="true"
          />

          <motion.span
            data-testid="scrubber-thumb"
            animate={{
              scale: isDragging ? 1.38 : hoverRatio !== null ? 1.15 : 1,
            }}
            transition={BOUNCY_SPRING}
            className="relative w-4 h-3.5 rounded-full bg-white border-2 shadow-[0_3px_10px_rgba(29,34,56,0.22)] will-change-transform"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Strictly LTR Tabular Timestamps: Elapsed Left, Remaining (-1:28) Right */}
      <div
        dir="ltr"
        data-testid="scrubber-timestamps"
        className="flex items-center justify-between text-xs font-medium text-[#545C7A] tabular-nums px-0.5"
      >
        <span
          data-testid="scrubber-elapsed-time"
          style={{ unicodeBidi: 'isolate' }}
        >
          {formatTime(elapsedSeconds)}
        </span>
        <span
          data-testid="scrubber-remaining-time"
          style={{ unicodeBidi: 'isolate' }}
        >
          {`-${formatTime(remainingSeconds)}`}
        </span>
      </div>
    </div>
  );
}
