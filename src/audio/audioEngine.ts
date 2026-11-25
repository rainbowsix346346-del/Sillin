import { EqBands, Track } from '../types/music';

/**
 * Web Audio Engine for local user audio files (MP3 / FLAC / WAV / M4A / OGG):
 * - Routes HTMLAudioElement through a 5-band BiquadFilterNode EQ, crossfade GainNode,
 *   and AnalyserNode for live 60fps spectrum & bass-reactive visuals.
 */
export class VinylAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(128));

  private currentTrack: Track | null = null;
  private isPlaying = false;
  private playbackRate = 1;
  private crossfadeSeconds = 2;
  private eqBands: EqBands = { sub: 3, bass: 4, mid: 1, presence: -1, air: 2 };

  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      const freqs = [60, 230, 910, 3600, 14000];
      const types: BiquadFilterType[] = [
        'lowshelf',
        'peaking',
        'peaking',
        'peaking',
        'highshelf',
      ];

      this.eqFilters = freqs.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = types[idx];
        filter.frequency.value = freq;
        filter.Q.value = 1.0;
        return filter;
      });

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount)
      );

      let node: AudioNode = this.masterGain;
      for (const filter of this.eqFilters) {
        node.connect(filter);
        node = filter;
      }
      node.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.applyEqToFilters();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyEqToFilters(): void {
    if (this.eqFilters.length !== 5) return;
    const values = [
      this.eqBands.sub,
      this.eqBands.bass,
      this.eqBands.mid,
      this.eqBands.presence,
      this.eqBands.air,
    ];
    values.forEach((db, i) => {
      this.eqFilters[i].gain.value = db;
    });
  }

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.preload = 'auto';
    }
    return this.audioEl;
  }

  private connectMediaElement(): void {
    const ctx = this.ensureContext();
    const el = this.ensureAudioElement();
    if (!ctx || !el || !this.masterGain || this.mediaSource) return;
    try {
      this.mediaSource = ctx.createMediaElementSource(el);
      this.mediaSource.connect(this.masterGain);
    } catch {
      // Already connected
    }
  }

  public setCrossfadeSeconds(seconds: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, seconds));
  }

  public loadTrack(track: Track, autoPlay = false): void {
    this.currentTrack = track;
    const el = this.ensureAudioElement();
    if (!el) return;

    el.pause();
    el.src = track.audioUrl;
    el.playbackRate = this.playbackRate;
    el.currentTime = 0;

    if (autoPlay) {
      this.play();
    } else {
      this.isPlaying = false;
    }
  }

  public play(): void {
    if (!this.currentTrack) return;
    this.isPlaying = true;
    const ctx = this.ensureContext();
    this.connectMediaElement();

    if (ctx && this.masterGain) {
      const now = ctx.currentTime;
      const fadeIn = Math.min(1.2, Math.max(0.06, this.crossfadeSeconds * 0.25));
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(
        Math.max(0.02, this.masterGain.gain.value),
        now
      );
      this.masterGain.gain.linearRampToValueAtTime(0.85, now + fadeIn);
    }

    if (this.audioEl) {
      this.audioEl.playbackRate = this.playbackRate;
      this.audioEl.play().catch(() => {});
    }
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.audioEl) {
      this.audioEl.pause();
      try {
        this.audioEl.currentTime = 0;
      } catch {
        // Ignore seek before metadata ready
      }
    }
  }

  public reset(): void {
    this.isPlaying = false;
    this.currentTrack = null;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.removeAttribute('src');
      this.audioEl.load();
    }
  }

  public seek(seconds: number): void {
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(dur || seconds, seconds));
    if (this.audioEl && Number.isFinite(clamped)) {
      try {
        this.audioEl.currentTime = clamped;
      } catch {
        // Ignore seek before metadata ready
      }
    }
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2, rate));
    if (this.audioEl) {
      this.audioEl.playbackRate = this.playbackRate;
    }
  }

  public setEqBands(bands: EqBands): void {
    this.eqBands = { ...bands };
    this.applyEqToFilters();
  }

  public getCurrentTime(): number {
    if (this.audioEl && Number.isFinite(this.audioEl.currentTime)) {
      return this.audioEl.currentTime;
    }
    return 0;
  }

  public getDuration(): number {
    if (
      this.audioEl &&
      Number.isFinite(this.audioEl.duration) &&
      this.audioEl.duration > 0
    ) {
      return this.audioEl.duration;
    }
    return this.currentTrack?.duration || 0;
  }

  public getFrequencyBars(count: number): number[] {
    const bars = new Array<number>(count).fill(0.14);
    const now = performance.now() / 1000;

    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.freqData);
      let maxVal = 0;
      for (let i = 0; i < this.freqData.length; i++) {
        if (this.freqData[i] > maxVal) maxVal = this.freqData[i];
      }

      if (maxVal > 6) {
        const usableBins = Math.floor(this.freqData.length * 0.72);
        for (let i = 0; i < count; i++) {
          const bin = Math.min(
            usableBins - 1,
            Math.floor((i / count) * usableBins)
          );
          const v = this.freqData[bin] / 255;
          bars[i] = Math.max(0.14, Math.min(1, v * 1.15));
        }
        return bars;
      }
    }

    for (let i = 0; i < count; i++) {
      const wave =
        0.24 +
        0.18 * Math.sin(i * 0.42 + now * (this.isPlaying ? 3.2 : 0.7)) +
        0.12 * Math.cos(i * 0.25 - now * (this.isPlaying ? 2.1 : 0.45));
      bars[i] = this.isPlaying
        ? Math.max(0.16, Math.min(0.86, wave + 0.16))
        : Math.max(0.12, Math.min(0.32, wave * 0.55));
    }
    return bars;
  }

  public getBassEnergy(): number {
    if (!this.isPlaying) return 0;
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      let sum = 0;
      const bins = Math.min(10, this.freqData.length);
      for (let i = 0; i < bins; i++) {
        sum += this.freqData[i];
      }
      const normalized = sum / (bins * 255);
      if (normalized > 0.03) {
        return Math.min(1, normalized * 1.45);
      }
    }
    const t = performance.now() / 1000;
    return 0.22 + 0.18 * ((Math.sin(t * 2.4) + 1) * 0.5);
  }

  public dispose(): void {
    this.reset();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const vinylAudioEngine = new VinylAudioEngine();
