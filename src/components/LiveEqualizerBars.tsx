import { useEffect, useRef } from 'react';
import { vinylAudioEngine } from '../audio/audioEngine';

interface LiveEqualizerBarsProps {
  isPlaying: boolean;
  /** Optional override color; defaults to dynamic theme accent */
  color?: string;
  className?: string;
}

/**
 * Tiny 60fps GPU-accelerated 3-bar real-time audio equalizer icon.
 * Reads live low/mid/high frequency energy from vinylAudioEngine and animates
 * strictly via compositor-only `transform: scaleY(...)`.
 */
export function LiveEqualizerBars({
  isPlaying,
  color = 'var(--accent)',
  className = '',
}: LiveEqualizerBarsProps) {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const levelsRef = useRef<[number, number, number]>([0.38, 0.72, 0.5]);

  useEffect(() => {
    let rafId = 0;
    let lastFrame = 0;

    const tick = (now: number) => {
      if (now - lastFrame >= 16) {
        lastFrame = now;
        const bars = isPlaying
          ? vinylAudioEngine.getFrequencyBars(6)
          : [0.24, 0.34, 0.28, 0.24, 0.32, 0.26];

        // Sample 3 distinct harmonic bands + subtle phase life so even quiet intros shimmer naturally
        const t = now * 0.0055;
        const targets: [number, number, number] = isPlaying
          ? [
              Math.min(1, Math.max(0.24, bars[0] * 0.85 + 0.22 + Math.sin(t * 1.4) * 0.14)),
              Math.min(1, Math.max(0.28, bars[2] * 0.92 + 0.28 + Math.cos(t * 1.9) * 0.16)),
              Math.min(1, Math.max(0.22, bars[4] * 0.88 + 0.2 + Math.sin(t * 2.3 + 1.1) * 0.15)),
            ]
          : [0.24, 0.34, 0.26];

        for (let i = 0; i < 3; i++) {
          const prev = levelsRef.current[i];
          const next = prev + (targets[i] - prev) * (isPlaying ? 0.32 : 0.18);
          levelsRef.current[i] = next;
          const el = barRefs.current[i];
          if (el) {
            el.style.transform = `scaleY(${next.toFixed(3)})`;
          }
        }
      }

      if (isPlaying) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    } else {
      // Settle cleanly to low paused bars
      const idle: [number, number, number] = [0.24, 0.36, 0.26];
      idle.forEach((v, i) => {
        levelsRef.current[i] = v;
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleY(${v})`;
      });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  return (
    <span
      data-testid="live-equalizer-bars"
      data-playing={isPlaying ? 'true' : 'false'}
      aria-label={isPlaying ? 'Now playing' : 'Paused'}
      className={`inline-flex items-end justify-center gap-[2.5px] h-3.5 w-3.5 shrink-0 ${className}`}
    >
      {[0, 1, 2].map((idx) => (
        <span
          key={idx}
          ref={(el) => {
            barRefs.current[idx] = el;
          }}
          className="w-[3px] h-full rounded-full origin-bottom will-change-transform"
          style={{
            backgroundColor: color,
            transform: `scaleY(${idx === 1 ? 0.72 : idx === 0 ? 0.42 : 0.56})`,
          }}
        />
      ))}
    </span>
  );
}
