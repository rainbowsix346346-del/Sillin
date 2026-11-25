import { useEffect, useRef } from 'react';
import { AccentPalette } from '../types/music';
import { vinylAudioEngine } from '../audio/audioEngine';

interface AmbientBreathingAuraProps {
  palette: AccentPalette;
  isPlaying: boolean;
}

/**
 * Multi-Layered Slow-Breathing Ambient Color Mesh behind Now Playing centerpiece:
 * - 3 soft diffused organic color lobes derived from extracted album art (strictly non-neon)
 * - Drives scale, orbital drift, and opacity at 60fps strictly via GPU transform & opacity
 * - Reacts smoothly to live Web Audio bass energy when playing, and breathes gently when paused
 */
export function AmbientBreathingAura({
  palette,
  isPlaying,
}: AmbientBreathingAuraProps) {
  const lobe1Ref = useRef<HTMLDivElement>(null);
  const lobe2Ref = useRef<HTMLDivElement>(null);
  const lobe3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let lastTime = 0;
    let phase = 0;
    let smoothBass = 0.14;

    const tick = (now: number) => {
      if (now - lastTime >= 16) {
        const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
        lastTime = now;
        phase += dt * (isPlaying ? 0.95 : 0.38);

        const rawBass = isPlaying ? vinylAudioEngine.getBassEnergy() : 0.05;
        const idleWave = (Math.sin(phase * 1.1) + 1) * 0.5;
        const target = isPlaying
          ? Math.max(rawBass, 0.18 + idleWave * 0.16)
          : 0.08 + idleWave * 0.08;
        smoothBass += (target - smoothBass) * 0.12;

        const driftX1 = Math.sin(phase * 0.72) * 22;
        const driftY1 = Math.cos(phase * 0.58) * 16;
        const scale1 = 0.96 + smoothBass * 0.24;

        const driftX2 = Math.cos(phase * 0.64 + 1.4) * 26;
        const driftY2 = Math.sin(phase * 0.51 + 0.8) * 18;
        const scale2 = 0.92 + smoothBass * 0.28;

        const driftX3 = Math.sin(phase * 0.48 + 2.6) * 18;
        const driftY3 = Math.cos(phase * 0.68 + 1.9) * 20;
        const scale3 = 0.94 + smoothBass * 0.2;

        if (lobe1Ref.current) {
          lobe1Ref.current.style.transform = `translate3d(${driftX1.toFixed(1)}px, ${driftY1.toFixed(1)}px, 0) scale(${scale1.toFixed(3)})`;
          lobe1Ref.current.style.opacity = (0.46 + smoothBass * 0.34).toFixed(3);
        }
        if (lobe2Ref.current) {
          lobe2Ref.current.style.transform = `translate3d(${driftX2.toFixed(1)}px, ${driftY2.toFixed(1)}px, 0) scale(${scale2.toFixed(3)})`;
          lobe2Ref.current.style.opacity = (0.36 + smoothBass * 0.32).toFixed(3);
        }
        if (lobe3Ref.current) {
          lobe3Ref.current.style.transform = `translate3d(${driftX3.toFixed(1)}px, ${driftY3.toFixed(1)}px, 0) scale(${scale3.toFixed(3)})`;
          lobe3Ref.current.style.opacity = (0.3 + smoothBass * 0.28).toFixed(3);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return (
    <div
      data-testid="ambient-breathing-aura"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-0"
    >
      {/* Primary Album Hue Lobe */}
      <div
        ref={lobe1Ref}
        className="absolute top-[16%] left-[12%] w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] rounded-full blur-3xl will-change-transform"
        style={{
          background: `radial-gradient(circle, ${palette.auraPrimary} 0%, transparent 72%)`,
          opacity: 0.56,
        }}
      />

      {/* Secondary Harmonic Lobe */}
      <div
        ref={lobe2Ref}
        className="absolute top-[24%] right-[8%] w-[240px] h-[240px] sm:w-[310px] sm:h-[310px] rounded-full blur-3xl will-change-transform"
        style={{
          background: `radial-gradient(circle, ${palette.auraSecondary} 0%, transparent 72%)`,
          opacity: 0.44,
        }}
      />

      {/* Warm Editorial Accent Wash */}
      <div
        ref={lobe3Ref}
        className="absolute top-[36%] left-[26%] w-[220px] h-[220px] sm:w-[290px] sm:h-[290px] rounded-full blur-3xl will-change-transform"
        style={{
          background: `radial-gradient(circle, ${palette.accentWarm}40 0%, transparent 72%)`,
          opacity: 0.36,
        }}
      />
    </div>
  );
}
