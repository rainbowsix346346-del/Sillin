import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AccentPalette,
  AnimationPhysicsMode,
  Track,
  VinylRpm,
} from '../types/music';
import { vinylAudioEngine } from '../audio/audioEngine';
import { BOUNCY_SPRING } from '../data/catalog';
import { angleDeltaToTimeDelta, normalizeAngleDelta } from '../utils/lrcParser';
import { formatTime } from '../utils/musicLogic';
import { CoverArt } from './CoverArt';
import { ColoredVinylSvg } from './ColoredVinylSvg';

interface TurntableProps {
  track: Track;
  palette: AccentPalette;
  isPlaying: boolean;
  playbackRate: number;
  vinylRpm: VinylRpm;
  scratchSensitivity: number;
  physics: AnimationPhysicsMode;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onScrubTime: (seconds: number) => void;
}

/**
 * Interactive Scratchable Marbled Vinyl Turntable:
 * - Grab and rotate the vinyl platter directly to scrub forward/backward with rotational inertia
 * - Bass-reactive ambient aura layer driven via GPU transform/opacity at 60fps
 * - Realistic spring-animated tonearm
 */
export function Turntable({
  track,
  palette,
  isPlaying,
  playbackRate,
  vinylRpm,
  scratchSensitivity,
  currentTime,
  duration,
  onTogglePlay,
  onScrubTime,
}: TurntableProps) {
  const discRef = useRef<HTMLDivElement>(null);
  const auraPrimaryRef = useRef<HTMLDivElement>(null);
  const auraSecondaryRef = useRef<HTMLDivElement>(null);

  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const rateRef = useRef(playbackRate);
  const rpmRef = useRef(vinylRpm);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastPointerAngleRef = useRef(0);
  const lastDragTsRef = useRef(0);
  const scratchTimeRef = useRef(currentTime);

  const [isScratching, setIsScratching] = useState(false);
  const [scratchPreviewSec, setScratchPreviewSec] = useState<number | null>(null);

  isPlayingRef.current = isPlaying;
  rateRef.current = playbackRate;
  rpmRef.current = vinylRpm;
  currentTimeRef.current = currentTime;
  durationRef.current = Math.max(1, duration);

  // Throttled 60fps rotational inertia + bass-reactive GPU aura loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let smoothBass = 0;
    let breathPhase = 0;

    const tick = (now: number) => {
      if (now - lastTime >= 16) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        breathPhase += dt * (isPlayingRef.current ? 1.9 : 0.7);

        if (!isDraggingRef.current) {
          const baseDegPerSec = rpmRef.current === 45 ? 102 : 76;
          const targetVelocity = isPlayingRef.current
            ? baseDegPerSec * rateRef.current
            : 0;
          const damping = isPlayingRef.current ? 0.085 : 0.06;
          velocityRef.current +=
            (targetVelocity - velocityRef.current) * damping;

          if (Math.abs(velocityRef.current) < 0.08 && !isPlayingRef.current) {
            velocityRef.current = 0;
          }

          angleRef.current = (angleRef.current + velocityRef.current * dt) % 360;
          if (discRef.current) {
            discRef.current.style.transform = `rotate(${angleRef.current.toFixed(2)}deg)`;
          }
        }

        const liveBass = isPlayingRef.current
          ? vinylAudioEngine.getBassEnergy()
          : 0;
        const idleBreath = (Math.sin(breathPhase) + 1) * 0.5;
        const targetEnergy = isPlayingRef.current
          ? Math.max(liveBass, idleBreath * 0.25)
          : idleBreath * 0.14;
        smoothBass += (targetEnergy - smoothBass) * 0.15;

        if (auraPrimaryRef.current) {
          const scale = 0.94 + smoothBass * 0.22;
          const opacity = isPlayingRef.current
            ? 0.58 + smoothBass * 0.36
            : 0.38 + smoothBass * 0.15;
          auraPrimaryRef.current.style.transform = `scale(${scale.toFixed(3)})`;
          auraPrimaryRef.current.style.opacity = opacity.toFixed(3);
        }

        if (auraSecondaryRef.current) {
          const scale2 = 0.98 + smoothBass * 0.28;
          const opacity2 = isPlayingRef.current
            ? 0.42 + smoothBass * 0.36
            : 0.24 + smoothBass * 0.12;
          auraSecondaryRef.current.style.transform = `scale(${scale2.toFixed(3)})`;
          auraSecondaryRef.current.style.opacity = opacity2.toFixed(3);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const getPointerAngleDeg = (clientX: number, clientY: number): number => {
    const el = discRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    lastPointerAngleRef.current = getPointerAngleDeg(e.clientX, e.clientY);
    lastDragTsRef.current = performance.now();
    scratchTimeRef.current = currentTimeRef.current;
    setIsScratching(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const nextAngle = getPointerAngleDeg(e.clientX, e.clientY);
    const deltaDeg = normalizeAngleDelta(lastPointerAngleRef.current, nextAngle);
    lastPointerAngleRef.current = nextAngle;

    if (Math.abs(deltaDeg) > 1.2) {
      dragMovedRef.current = true;
    }

    const now = performance.now();
    const dt = Math.max(0.008, (now - lastDragTsRef.current) / 1000);
    lastDragTsRef.current = now;

    angleRef.current = (angleRef.current + deltaDeg) % 360;
    velocityRef.current = Math.max(-540, Math.min(540, deltaDeg / dt));

    if (discRef.current) {
      discRef.current.style.transform = `rotate(${angleRef.current.toFixed(2)}deg)`;
    }

    const timeDelta = angleDeltaToTimeDelta(deltaDeg, scratchSensitivity);
    const nextSec = Math.max(
      0,
      Math.min(durationRef.current, scratchTimeRef.current + timeDelta)
    );
    scratchTimeRef.current = nextSec;
    setScratchPreviewSec(nextSec);
    onScrubTime(nextSec);
  };

  const handlePointerRelease = () => {
    if (!isDraggingRef.current) return;
    const wasDrag = dragMovedRef.current;
    isDraggingRef.current = false;
    setIsScratching(false);
    setScratchPreviewSec(null);

    if (!wasDrag) {
      onTogglePlay();
    }
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const tonearmAngle = isPlaying
    ? 17 + Math.min(1, Math.max(0, progressRatio)) * 18
    : -6;

  return (
    <div
      className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-square mx-auto select-none"
      data-testid="turntable-stage"
    >
      {/* Bass-Reactive Ambient Aura (strictly GPU transform & opacity) */}
      <div
        ref={auraSecondaryRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-7 rounded-full blur-3xl will-change-transform"
        style={{
          background: `radial-gradient(circle at 64% 38%, ${palette.auraSecondary} 0%, transparent 70%)`,
          transform: 'scale(1)',
          opacity: 0.4,
        }}
      />
      <div
        ref={auraPrimaryRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-5 rounded-full blur-2xl will-change-transform"
        style={{
          background: `radial-gradient(circle at 38% 58%, ${palette.auraPrimary} 0%, transparent 72%)`,
          transform: 'scale(1)',
          opacity: 0.52,
        }}
      />

      {/* Plinth Deck Surface */}
      <div
        className="relative z-10 w-full h-full rounded-[32px] p-4 sm:p-5 flex items-center justify-center accent-transition"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(var(--surface-rgb), 0.94))',
          boxShadow:
            'inset 0 2px 3px rgba(255,255,255,0.95), 0 22px 46px -18px rgba(var(--accent-rgb), 0.34), 0 4px 14px -4px rgba(29,34,56,0.08)',
        }}
      >
        {/* Recessed Brushed Metal Platter Rim */}
        <div className="relative w-[86%] aspect-square rounded-full p-2 bg-gradient-to-br from-[#D8DCEA] via-[#F2F4FB] to-[#C8CEDF] shadow-[inset_0_3px_8px_rgba(29,34,56,0.16)] flex items-center justify-center">
          {/* Interactive Scratchable Vinyl Platter */}
          <div
            ref={discRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerRelease}
            onPointerCancel={handlePointerRelease}
            data-testid="interactive-vinyl-disc"
            role="button"
            tabIndex={0}
            aria-label={
              isPlaying
                ? 'Drag vinyl to scrub or tap to pause'
                : 'Drag vinyl to scrub or tap to play'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTogglePlay();
              }
            }}
            className={`relative w-full h-full rounded-full shadow-[0_14px_30px_rgba(24,28,46,0.34)] flex items-center justify-center will-change-transform touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-[var(--accent)] ${
              isScratching ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <ColoredVinylSvg palette={palette} />
            <div className="absolute inset-0 rounded-full vinyl-specular pointer-events-none opacity-95" />

            {/* Center Album Artwork Label */}
            <div className="relative z-10 w-[42%] aspect-square rounded-full overflow-hidden ring-[3px] ring-white/25 shadow-lg pointer-events-none">
              <CoverArt
                src={track.coverUrl}
                alt={`${track.title} vinyl center label`}
                fallbackGradient={track.fallbackGradient}
                className="w-full h-full"
              />
            </div>

            {/* Brushed Steel Center Spindle */}
            <div
              className="absolute z-20 w-4 h-4 rounded-full bg-gradient-to-br from-white via-[#D2D6E4] to-[#7D85A1] ring-2 ring-[#1D2238]/30 shadow-inner pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Live Scratch Timestamp Badge */}
        {isScratching && scratchPreviewSec !== null && (
          <div
            data-testid="vinyl-scratch-badge"
            className="pointer-events-none absolute top-3.5 left-4 z-30 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white tabular-nums shadow-md"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {formatTime(scratchPreviewSec)}
          </div>
        )}

        {/* Realistic Articulated Tonearm */}
        <div
          className="pointer-events-none absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 rounded-full bg-gradient-to-br from-white via-[#E4E7F2] to-[#C2C8DC] shadow-md flex items-center justify-center z-20"
          aria-hidden="true"
        >
          <div className="w-5 h-5 rounded-full bg-[#3A415A] shadow-inner" />

          <motion.div
            animate={{
              rotate: tonearmAngle,
              scale: isPlaying && !isScratching ? 1 : 1.03,
            }}
            transition={BOUNCY_SPRING}
            style={{ transformOrigin: '50% 0%' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[5px] h-[145px] sm:h-[164px]"
          >
            <div className="w-full h-[126px] sm:h-[144px] rounded-full bg-gradient-to-r from-[#8D94AD] via-[#F2F4FA] to-[#6F768F] shadow-sm" />
            <div
              className="absolute bottom-2 -left-1.5 w-4 h-8 rounded-md rotate-[24deg] shadow-md flex flex-col items-center justify-end pb-1 accent-transition"
              style={{ backgroundColor: 'var(--accent-dark)' }}
            >
              <div className="w-1.5 h-2 rounded-full bg-white/85" />
            </div>
          </motion.div>
        </div>

        {/* Subtle RPM Indicator */}
        <div
          className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-[#545C7A] tabular-nums"
          aria-hidden="true"
        >
          <span
            className="w-2 h-2 rounded-full accent-transition"
            style={{
              backgroundColor: isPlaying ? 'var(--accent)' : '#A4ACC4',
            }}
          />
          <span>{vinylRpm === 45 ? '45 RPM' : '33⅓ RPM'}</span>
        </div>
      </div>
    </div>
  );
}
