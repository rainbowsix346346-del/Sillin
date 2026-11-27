import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';

interface FavoriteHeartButtonProps {
  isFavorite: boolean;
  ariaLabel: string;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
  testId?: string;
}

// 6 radial particle angles for subtle, non-neon color-matched micro-burst
const BURST_PARTICLES = [
  { angle: -85, dist: 19, size: 4.5, color: 'var(--accent)' },
  { angle: -25, dist: 21, size: 3.5, color: 'var(--accent-warm)' },
  { angle: 35, dist: 18, size: 4, color: 'var(--accent-secondary)' },
  { angle: 95, dist: 19, size: 3.5, color: 'var(--accent)' },
  { angle: 155, dist: 21, size: 4.5, color: 'var(--accent-warm)' },
  { angle: 215, dist: 18, size: 3.5, color: 'var(--accent-secondary)' },
];

/**
 * Playful Elastic Jelly-Bounce Heart Button with Micro-Particle Burst:
 * - GPU-only transform & opacity animations
 * - On favorite tap: jelly sequence `1 -> 1.35 -> 0.9 -> 1` + radial color-matched dots
 */
export function FavoriteHeartButton({
  isFavorite,
  ariaLabel,
  onToggle,
  size = 'sm',
  className = '',
  testId,
}: FavoriteHeartButtonProps) {
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [jellyAnim, setJellyAnim] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const willFavorite = !isFavorite;
    onToggle();

    if (willFavorite) {
      setBurstKey((k) => k + 1);
      setShowBurst(true);
      setJellyAnim(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setShowBurst(false);
        setJellyAnim(false);
      }, 480);
    }
  };

  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={isFavorite}
      data-testid={testId}
      data-favorited={isFavorite ? 'true' : 'false'}
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className}`}
    >
      {/* Subtle Color-Matched Radial Micro-Particle Burst */}
      <AnimatePresence>
        {showBurst && (
          <span
            key={burstKey}
            data-testid="heart-micro-burst"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Delicate expanding halo ring */}
            <motion.span
              initial={{ scale: 0.45, opacity: 0.65 }}
              animate={{ scale: 1.55, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="absolute w-7 h-7 rounded-full border-2 will-change-transform"
              style={{ borderColor: 'var(--accent)' }}
            />
            {BURST_PARTICLES.map((p, idx) => {
              const rad = (p.angle * Math.PI) / 180;
              const tx = Math.cos(rad) * p.dist;
              const ty = Math.sin(rad) * p.dist;
              return (
                <motion.span
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0.2, opacity: 0.95 }}
                  animate={{ x: tx, y: ty, scale: [0.3, 1.1, 0.2], opacity: [0.95, 0.9, 0] }}
                  transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute rounded-full will-change-transform"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                  }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>

      {/* Jelly-Bounce Heart Icon (scale: 1 -> 1.35 -> 0.9 -> 1) */}
      <motion.span
        animate={
          jellyAnim
            ? { scale: [1, 1.35, 0.9, 1.06, 1] }
            : { scale: 1 }
        }
        whileTap={{ scale: 0.84 }}
        transition={
          jellyAnim
            ? { duration: 0.44, times: [0, 0.3, 0.58, 0.8, 1], ease: 'easeOut' }
            : { duration: 0.16 }
        }
        className="relative z-10 flex items-center justify-center will-change-transform"
      >
        <Heart
          className={`${iconClass} transition-colors duration-150`}
          style={{
            color: isFavorite ? 'var(--accent)' : '#545C7A',
            fill: isFavorite ? 'var(--accent)' : 'transparent',
          }}
        />
      </motion.span>
    </button>
  );
}
