import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AccentPalette, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { vinylAudioEngine } from '../audio/audioEngine';
import { CoverArt } from './CoverArt';

interface GlassCoverProps {
  track: Track;
  palette: AccentPalette;
  isPlaying: boolean;
  tiltHint?: string;
  onTogglePlay: () => void;
}

/**
 * Modern Glass Album Art Centerpiece:
 * - Rounded-square (28px radius) cover card with frosted glass rim
 * - Deep diffused ambient shadow matching extracted cover palette
 * - 3D parallax tilt on touch/pointer drag
 * - Gentle bass-reactive breathing pulse (strictly GPU transform/opacity at 60fps)
 */
export function GlassCover({
  track,
  palette,
  isPlaying,
  tiltHint,
  onTogglePlay,
}: GlassCoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 30 });
  const [isPressed, setIsPressed] = useState(false);

  // Throttled 60fps bass-reactive breathing pulse using direct GPU transform/opacity (zero React churn)
  useEffect(() => {
    let rafId = 0;
    let smoothBass = 0;
    let phase = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      if (now - lastTime >= 16) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        phase += dt * (isPlaying ? 1.8 : 0.65);

        const liveBass = isPlaying ? vinylAudioEngine.getBassEnergy() : 0;
        const idleBreath = (Math.sin(phase) + 1) * 0.5;
        const target = isPlaying
          ? Math.max(liveBass, idleBreath * 0.22)
          : idleBreath * 0.1;
        smoothBass += (target - smoothBass) * 0.14;

        if (auraRef.current) {
          const auraScale = 0.96 + smoothBass * 0.22;
          const auraOpacity = isPlaying
            ? 0.62 + smoothBass * 0.34
            : 0.42 + smoothBass * 0.14;
          auraRef.current.style.transform = `translate3d(0, 14px, 0) scale(${auraScale.toFixed(3)})`;
          auraRef.current.style.opacity = auraOpacity.toFixed(3);
        }

        if (pulseRef.current) {
          const cardPulse = isPlaying ? 1 + smoothBass * 0.028 : 1;
          pulseRef.current.style.transform = `scale(${cardPulse.toFixed(4)})`;
        }
      }
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const updateTiltFromClient = (clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1; // -1..1
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1; // -1..1
    const clampedX = Math.max(-1, Math.min(1, nx));
    const clampedY = Math.max(-1, Math.min(1, ny));
    setTilt({
      rotateX: -clampedY * 10,
      rotateY: clampedX * 10,
      glareX: 50 + clampedX * 32,
      glareY: 50 + clampedY * 32,
    });
  };

  const resetTilt = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 30 });
    setIsPressed(false);
  };

  return (
    <div
      className="relative w-full max-w-[268px] sm:max-w-[300px] mx-auto select-none flex flex-col items-center"
      data-testid="glass-cover-centerpiece"
    >
      {/* Deep Diffused Ambient Shadow Layer (strictly GPU transform/opacity) */}
      <div
        ref={auraRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-7 rounded-[48px] blur-3xl will-change-transform"
        style={{
          background: `radial-gradient(circle at 38% 36%, ${palette.auraPrimary} 0%, ${palette.auraSecondary} 48%, transparent 76%)`,
          transform: 'translate3d(0, 14px, 0) scale(1)',
          opacity: 0.65,
        }}
      />

      {/* 3D Perspective Stage */}
      <div
        ref={cardRef}
        onPointerDown={(e) => {
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
          draggedRef.current = false;
          setIsPressed(true);
          updateTiltFromClient(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || isPressed) {
            if (pointerDownPosRef.current) {
              const dist = Math.hypot(
                e.clientX - pointerDownPosRef.current.x,
                e.clientY - pointerDownPosRef.current.y
              );
              if (dist > 8) draggedRef.current = true;
            }
            updateTiltFromClient(e.clientX, e.clientY);
          }
        }}
        onPointerUp={() => {
          if (!draggedRef.current && pointerDownPosRef.current) {
            onTogglePlay();
          }
          pointerDownPosRef.current = null;
          resetTilt();
        }}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
        style={{ perspective: 900 }}
        className="relative z-10 w-full aspect-square touch-none cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTogglePlay();
          }
        }}
      >
        <div ref={pulseRef} className="w-full h-full will-change-transform">
          <motion.div
            layoutId="player-art"
            animate={{
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              scale: isPressed ? 0.975 : isPlaying ? 1 : 0.96,
            }}
            transition={BOUNCY_SPRING}
            style={{
              transformStyle: 'preserve-3d',
              boxShadow: `0 26px 50px -18px rgba(${palette.rgb.join(',')}, 0.48), 0 8px 20px -8px rgba(29, 34, 56, 0.16)`,
            }}
            className="relative w-full h-full rounded-[28px] p-[5px] bg-white/65 ring-1 ring-white/90 overflow-hidden"
          >
            {/* Inner Artwork Container */}
            <div className="relative w-full h-full rounded-[23px] overflow-hidden">
              <CoverArt
                src={track.coverUrl}
                alt={track.title}
                fallbackGradient={track.fallbackGradient}
                className="w-full h-full"
              />

              {/* Subtle Glass Specular Rim & Dynamic Parallax Glare */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[23px] ring-1 ring-inset ring-white/40"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.04) 44%, transparent 72%)`,
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {tiltHint && (
        <p className="relative z-10 mt-2.5 text-[11px] font-medium text-[#7C84A3] tracking-tight">
          {tiltHint}
        </p>
      )}
    </div>
  );
}
