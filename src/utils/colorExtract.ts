import { AccentPalette, ThemeIntensity } from '../types/music';

export const DEFAULT_ACCENT_PALETTE: AccentPalette = {
  accent: '#4A558F',
  accentDark: '#364073',
  canvasBg: '#F7F8FC',
  cardSurface: '#ECEFF8',
  accentSoft: '#E3E7F5',
  accentSecondary: '#6F7EB8',
  accentWarm: '#94789E',
  vinylBase: '#2F3862',
  vinylMid: '#5866A3',
  vinylSplatter: '#B9C3E8',
  auraPrimary: 'rgba(74, 85, 143, 0.24)',
  auraSecondary: 'rgba(130, 144, 204, 0.18)',
  rgb: [74, 85, 143],
  surfaceRgb: [236, 239, 248],
  hueName: 'Indigo Slate',
};

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [74, 85, 143];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function describeHue(hue: number, intensity: ThemeIntensity): string {
  if (intensity === 'monochrome') return 'Architectural Slate';
  const h = ((hue % 360) + 360) % 360;
  if (h < 28 || h >= 335) return 'Warm Terracotta';
  if (h < 62) return 'Honey Ochre';
  if (h < 155) return 'Sage Conservatory';
  if (h < 210) return 'Nordic Mist';
  if (h < 268) return 'Indigo Slate';
  return 'Twilight Rose';
}

/**
 * Builds a complete 3-color editorial Material You palette calibrated by ThemeIntensity
 * while strictly remaining clean and non-neon (saturation <= 46%).
 */
export function computeRefinedAccentFromRgb(
  r: number,
  g: number,
  b: number,
  secondaryRgbSample?: [number, number, number],
  moodShiftDeg = 0,
  intensity: ThemeIntensity = 'vibrant'
): AccentPalette {
  const [rawH, rawS] = rgbToHsl(r, g, b);

  const baseHue = (((rawS < 8 ? 230 : rawH) + moodShiftDeg) % 360 + 360) % 360;

  let secondHue = (baseHue + 28) % 360;
  if (secondaryRgbSample) {
    const [secH, secS] = rgbToHsl(...secondaryRgbSample);
    if (secS >= 10) {
      secondHue = ((secH + moodShiftDeg) % 360 + 360) % 360;
    }
  }
  const thirdHue = (baseHue + 332) % 360;

  const satMultiplier =
    intensity === 'monochrome' ? 0.08 : intensity === 'subtle' ? 0.56 : 1.0;

  const primarySat =
    intensity === 'monochrome'
      ? 6
      : Math.max(16, Math.min(46, (rawS * 0.72 + 18) * satMultiplier));

  const primaryLight =
    intensity === 'monochrome'
      ? 31
      : baseHue > 35 && baseHue < 78
        ? 36
        : 40;

  const accentRgb = hslToRgb(baseHue, primarySat, primaryLight);
  const darkRgb = hslToRgb(baseHue, Math.min(48, primarySat + 4), primaryLight - 9);

  const canvasSat =
    intensity === 'monochrome'
      ? 4
      : Math.max(8, Math.min(32, primarySat * (intensity === 'subtle' ? 0.45 : 0.74)));
  const canvasRgb = hslToRgb(baseHue, canvasSat, intensity === 'subtle' ? 98.1 : 97.2);

  const cardSat =
    intensity === 'monochrome'
      ? 6
      : Math.max(10, Math.min(34, primarySat * (intensity === 'subtle' ? 0.52 : 0.8)));
  const cardRgb = hslToRgb(baseHue, cardSat, 92.8);
  const softRgb = hslToRgb(baseHue, Math.max(8, cardSat), 89.2);

  const secondaryRgb = hslToRgb(
    secondHue,
    intensity === 'monochrome' ? 5 : Math.max(18, Math.min(44, primarySat)),
    54
  );
  const warmRgb = hslToRgb(
    thirdHue,
    intensity === 'monochrome' ? 4 : Math.max(16, Math.min(40, primarySat - 2)),
    52
  );

  const vinylBaseRgb = hslToRgb(
    baseHue,
    intensity === 'monochrome' ? 6 : Math.min(46, primarySat + 4),
    24
  );
  const vinylMidRgb = hslToRgb(
    secondHue,
    intensity === 'monochrome' ? 6 : Math.min(48, primarySat + 6),
    43
  );
  const vinylSplatterRgb = hslToRgb(
    thirdHue,
    intensity === 'monochrome' ? 4 : Math.max(20, primarySat),
    76
  );

  const auraAlphaPrimary =
    intensity === 'monochrome' ? 0.16 : intensity === 'subtle' ? 0.2 : 0.3;
  const auraAlphaSecondary =
    intensity === 'monochrome' ? 0.12 : intensity === 'subtle' ? 0.15 : 0.24;

  const auraPrimaryRgb = hslToRgb(
    baseHue,
    intensity === 'monochrome' ? 6 : Math.min(52, primarySat + 10),
    60
  );
  const auraSecondaryRgb = hslToRgb(
    secondHue,
    intensity === 'monochrome' ? 5 : Math.min(48, primarySat + 6),
    68
  );

  return {
    accent: rgbToHex(...accentRgb),
    accentDark: rgbToHex(...darkRgb),
    canvasBg: rgbToHex(...canvasRgb),
    cardSurface: rgbToHex(...cardRgb),
    accentSoft: rgbToHex(...softRgb),
    accentSecondary: rgbToHex(...secondaryRgb),
    accentWarm: rgbToHex(...warmRgb),
    vinylBase: rgbToHex(...vinylBaseRgb),
    vinylMid: rgbToHex(...vinylMidRgb),
    vinylSplatter: rgbToHex(...vinylSplatterRgb),
    auraPrimary: `rgba(${auraPrimaryRgb[0]}, ${auraPrimaryRgb[1]}, ${auraPrimaryRgb[2]}, ${auraAlphaPrimary})`,
    auraSecondary: `rgba(${auraSecondaryRgb[0]}, ${auraSecondaryRgb[1]}, ${auraSecondaryRgb[2]}, ${auraAlphaSecondary})`,
    rgb: accentRgb,
    surfaceRgb: cardRgb,
    hueName: describeHue(baseHue, intensity),
  };
}

const paletteCache = new Map<string, AccentPalette>();

export async function extractAccentFromImage(
  imageUrl: string,
  fallbackHex = '#4A558F',
  moodShiftDeg = 0,
  intensity: ThemeIntensity = 'vibrant'
): Promise<AccentPalette> {
  const cacheKey = `${imageUrl}|${fallbackHex}|${moodShiftDeg}|${intensity}`;
  if (!imageUrl) {
    return computeRefinedAccentFromRgb(
      ...hexToRgb(fallbackHex),
      undefined,
      moodShiftDeg,
      intensity
    );
  }

  const cached = paletteCache.get(cacheKey);
  if (cached) return cached;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return computeRefinedAccentFromRgb(
      ...hexToRgb(fallbackHex),
      undefined,
      moodShiftDeg,
      intensity
    );
  }

  return new Promise<AccentPalette>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const size = 28;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(
            computeRefinedAccentFromRgb(
              ...hexToRgb(fallbackHex),
              undefined,
              moodShiftDeg,
              intensity
            )
          );
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = Array.from({ length: 12 }, () => ({
          r: 0,
          g: 0,
          b: 0,
          weight: 0,
        }));

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 180) continue;

          const [h, s, l] = rgbToHsl(r, g, b);
          if (l < 12 || l > 90) continue;

          const bucketIdx = Math.floor((h % 360) / 30) % 12;
          const weight = 1 + (s / 100) * 2.6;
          buckets[bucketIdx].r += r * weight;
          buckets[bucketIdx].g += g * weight;
          buckets[bucketIdx].b += b * weight;
          buckets[bucketIdx].weight += weight;
        }

        const ranked = buckets
          .map((bucket, idx) => ({ ...bucket, idx }))
          .filter((b) => b.weight > 0)
          .sort((a, b) => b.weight - a.weight);

        if (ranked.length === 0) {
          const fallback = computeRefinedAccentFromRgb(
            ...hexToRgb(fallbackHex),
            undefined,
            moodShiftDeg,
            intensity
          );
          paletteCache.set(cacheKey, fallback);
          resolve(fallback);
          return;
        }

        const top = ranked[0];
        const primarySample: [number, number, number] = [
          top.r / top.weight,
          top.g / top.weight,
          top.b / top.weight,
        ];

        const secondBucket =
          ranked.find(
            (b) =>
              Math.min(
                Math.abs(b.idx - top.idx),
                12 - Math.abs(b.idx - top.idx)
              ) >= 2
          ) || ranked[1];

        const secondarySample: [number, number, number] | undefined = secondBucket
          ? [
              secondBucket.r / secondBucket.weight,
              secondBucket.g / secondBucket.weight,
              secondBucket.b / secondBucket.weight,
            ]
          : undefined;

        const palette = computeRefinedAccentFromRgb(
          ...primarySample,
          secondarySample,
          moodShiftDeg,
          intensity
        );

        paletteCache.set(cacheKey, palette);
        resolve(palette);
      } catch {
        resolve(
          computeRefinedAccentFromRgb(
            ...hexToRgb(fallbackHex),
            undefined,
            moodShiftDeg,
            intensity
          )
        );
      }
    };

    img.onerror = () => {
      resolve(
        computeRefinedAccentFromRgb(
          ...hexToRgb(fallbackHex),
          undefined,
          moodShiftDeg,
          intensity
        )
      );
    };

    img.src = imageUrl;
  });
}

export function applyAccentPaletteToRoot(palette: AccentPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--canvas', palette.canvasBg);
  root.style.setProperty('--surface', palette.cardSurface);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-dark', palette.accentDark);
  root.style.setProperty('--accent-soft', palette.accentSoft);
  root.style.setProperty('--accent-secondary', palette.accentSecondary);
  root.style.setProperty('--accent-warm', palette.accentWarm);
  root.style.setProperty('--vinyl-base', palette.vinylBase);
  root.style.setProperty('--vinyl-mid', palette.vinylMid);
  root.style.setProperty('--vinyl-splatter', palette.vinylSplatter);
  root.style.setProperty('--aura-primary', palette.auraPrimary);
  root.style.setProperty('--aura-secondary', palette.auraSecondary);
  root.style.setProperty('--accent-rgb', palette.rgb.join(', '));
  root.style.setProperty('--surface-rgb', palette.surfaceRgb.join(', '));
  root.style.setProperty(
    '--accent-tint',
    `rgba(${palette.rgb[0]}, ${palette.rgb[1]}, ${palette.rgb[2]}, 0.13)`
  );
}
