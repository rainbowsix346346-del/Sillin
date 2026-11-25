import { useEffect, useRef } from 'react';
import { AccentPalette, Track } from '../types/music';
import { vinylAudioEngine } from '../audio/audioEngine';
import { CoverArt } from './CoverArt';

interface AmbientWaveProps {
  track: Track;
  palette: AccentPalette;
  isPlaying: boolean;
}

/**
 * Silky Multi-Layered Real-Time Fluid Audio Visualizer ("Ambient Wave"):
 * - Driven at 60fps by Web Audio API AnalyserNode frequency data (bass, mids, highs)
 * - Renders concentric organic harmonic liquid rings breathing around the album cover
 *   plus silky multi-layered Bezier fluid waves below, gracefully idling when paused
 */
export function AmbientWave({ track, palette, isPlaying }: AmbientWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let lastFrame = 0;
    let smoothBass = 0.2;
    let smoothMid = 0.2;
    let smoothHigh = 0.16;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const drawOrganicRing = (
      cx: number,
      cy: number,
      baseRadius: number,
      amp: number,
      lobes: number,
      rotPhase: number,
      strokeColor: string,
      fillColor: string,
      strokeAlpha: number,
      fillAlpha: number,
      lineWidth: number,
      bars: number[]
    ) => {
      const points = 64;
      const pts: { x: number; y: number }[] = [];

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const barIdx = Math.floor((i / points) * bars.length) % bars.length;
        const binBoost = isPlaying ? 0.55 + bars[barIdx] * 0.95 : 0.45;
        const wave =
          Math.sin(angle * lobes + rotPhase) * amp * binBoost +
          Math.cos(angle * (lobes + 2) - rotPhase * 1.35) * (amp * 0.42);
        const r = baseRadius + wave;
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }

      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % points];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5;
        if (i === 0) {
          const prev = pts[points - 1];
          ctx.moveTo((prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
        }
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.globalAlpha = fillAlpha;
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = strokeAlpha;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const draw = (now: number) => {
      if (now - lastFrame >= 16) {
        const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
        lastFrame = now;
        phase += dt * (isPlaying ? 2.15 : 0.62);

        const bars = vinylAudioEngine.getFrequencyBars(24);
        const bassLive = vinylAudioEngine.getBassEnergy();

        // Split 24 bins into Bass (0..6), Mids (7..15), Highs (16..23)
        const avgSlice = (start: number, end: number) => {
          let sum = 0;
          for (let i = start; i < end; i++) sum += bars[i] ?? 0;
          return sum / Math.max(1, end - start);
        };

        const targetBass = isPlaying
          ? Math.max(0.24, bassLive * 0.72 + avgSlice(0, 7) * 0.48)
          : 0.14 + Math.sin(phase) * 0.03;
        const targetMid = isPlaying
          ? Math.max(0.2, avgSlice(7, 16) * 0.95)
          : 0.12 + Math.cos(phase * 0.85) * 0.025;
        const targetHigh = isPlaying
          ? Math.max(0.16, avgSlice(16, 24) * 0.9)
          : 0.1 + Math.sin(phase * 1.15) * 0.02;

        smoothBass += (targetBass - smoothBass) * 0.15;
        smoothMid += (targetMid - smoothMid) * 0.16;
        smoothHigh += (targetHigh - smoothHigh) * 0.18;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        // 1. Concentric Organic Harmonic Rings centered around the floating cover emblem
        const cx = w * 0.5;
        const cy = h * 0.46;
        const minDim = Math.min(w, h);

        // Outer High-Frequency Halo Ring
        drawOrganicRing(
          cx,
          cy,
          minDim * (0.37 + smoothHigh * 0.045),
          6 + smoothHigh * 14,
          5,
          -phase * 0.78,
          palette.accentWarm,
          palette.accentWarm,
          0.42,
          0.08,
          1.4,
          bars
        );

        // Mid-Frequency Silky Harmonic Ring
        drawOrganicRing(
          cx,
          cy,
          minDim * (0.32 + smoothMid * 0.04),
          5 + smoothMid * 15,
          4,
          phase * 0.92,
          palette.accentSecondary,
          palette.accentSecondary,
          0.55,
          0.11,
          1.8,
          bars
        );

        // Inner Bass-Driven Liquid Ring
        drawOrganicRing(
          cx,
          cy,
          minDim * (0.275 + smoothBass * 0.038),
          4 + smoothBass * 13,
          3,
          phase * 1.18,
          palette.accent,
          palette.accent,
          0.74,
          0.14,
          2.2,
          bars
        );

        // 2. Silky Multi-Layered Fluid Ribbons gliding gently across the bottom edge
        const waveLayers = [
          {
            color: palette.accentWarm,
            alpha: 0.18,
            amp: 11 * (0.6 + smoothHigh),
            freq: 1.8,
            speed: 0.8,
            yBase: h * 0.87,
          },
          {
            color: palette.accentSecondary,
            alpha: 0.24,
            amp: 13 * (0.6 + smoothMid),
            freq: 2.3,
            speed: 1.1,
            yBase: h * 0.9,
          },
          {
            color: palette.accent,
            alpha: 0.32,
            amp: 15 * (0.6 + smoothBass),
            freq: 2.8,
            speed: 1.4,
            yBase: h * 0.93,
          },
        ];

        for (let l = 0; l < waveLayers.length; l++) {
          const wl = waveLayers[l];
          const steps = 32;
          const pts: { x: number; y: number }[] = [];
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = t * w;
            const env = Math.sin(t * Math.PI);
            const barIdx = Math.min(bars.length - 1, Math.floor(t * bars.length));
            const boost = isPlaying ? 0.65 + bars[barIdx] * 0.75 : 0.45;
            const y =
              wl.yBase +
              Math.sin(t * Math.PI * 2 * wl.freq + phase * wl.speed + l) *
                wl.amp *
                env *
                boost;
            pts.push({ x, y });
          }

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i + 1].x) * 0.5;
            const midY = (pts[i].y + pts[i + 1].y) * 0.5;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          ctx.lineTo(w, pts[pts.length - 1].y);

          ctx.strokeStyle = wl.color;
          ctx.globalAlpha = Math.min(0.75, wl.alpha + 0.34);
          ctx.lineWidth = l === 2 ? 2 : 1.3;
          ctx.stroke();

          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, wl.yBase - 16, 0, h);
          grad.addColorStop(0, wl.color);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = wl.alpha;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [palette.accent, palette.accentSecondary, palette.accentWarm, isPlaying]);

  return (
    <div
      className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-square mx-auto rounded-[32px] bg-white/55 ring-1 ring-white/85 shadow-[0_22px_46px_-18px_rgba(var(--accent-rgb),0.34)] overflow-hidden flex items-center justify-center"
      data-testid="ambient-wave-centerpiece"
    >
      {/* 60fps Organic Harmonic Ring & Fluid Ribbon Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        aria-label="Live organic harmonic audio visualizer"
      />

      {/* Centered Floating Album Cover Medallion inside the Breathing Harmonic Rings */}
      <div className="relative z-10 w-[108px] h-[108px] sm:w-[124px] sm:h-[124px] -translate-y-2 rounded-full p-[4px] bg-white/85 ring-1 ring-white shadow-[0_14px_30px_-10px_rgba(29,34,56,0.28)] overflow-hidden">
        <CoverArt
          src={track.coverUrl}
          alt={track.title}
          fallbackGradient={track.fallbackGradient}
          className="w-full h-full rounded-full"
        />
      </div>
    </div>
  );
}
