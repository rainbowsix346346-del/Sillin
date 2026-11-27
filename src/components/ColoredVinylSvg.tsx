import { useId } from 'react';
import { AccentPalette } from '../types/music';

interface ColoredVinylSvgProps {
  palette: AccentPalette;
}

/**
 * Custom translucent marble & color-splatter vinyl pressing SVG:
 * Dynamically tinted from the active track's extracted 3-color palette,
 * featuring organic wax marbling, fine color-splatter streaks, translucent rim glow,
 * and delicate concentric micro-grooves.
 */
export function ColoredVinylSvg({ palette }: ColoredVinylSvgProps) {
  const uid = useId().replace(/:/g, '');
  const baseGradId = `vinyl-base-${uid}`;
  const marbleGradId = `vinyl-marble-${uid}`;
  const splatterGradId = `vinyl-splatter-${uid}`;
  const glowGradId = `vinyl-glow-${uid}`;
  const blurFilterId = `vinyl-soft-${uid}`;
  const clipId = `vinyl-clip-${uid}`;

  // Concentric groove radii from outer lead-in to inner run-out
  const grooveRadii = [
    94, 91, 88, 85, 82, 79, 76, 73, 70, 67, 64, 61, 58, 55, 52, 49, 46,
  ];

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full block"
      aria-hidden="true"
      data-testid="colored-vinyl-svg"
      data-vinyl-base={palette.vinylBase}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="100" cy="100" r="99" />
        </clipPath>

        {/* Translucent colored wax radial base */}
        <radialGradient id={baseGradId} cx="42%" cy="38%" r="68%">
          <stop offset="0%" stopColor={palette.vinylMid} stopOpacity="0.95" />
          <stop offset="56%" stopColor={palette.vinylBase} stopOpacity="0.96" />
          <stop offset="88%" stopColor={palette.accentDark} stopOpacity="0.98" />
          <stop offset="100%" stopColor={palette.vinylMid} stopOpacity="0.92" />
        </radialGradient>

        {/* Soft organic marble swirl gradient */}
        <linearGradient id={marbleGradId} x1="10%" y1="12%" x2="88%" y2="85%">
          <stop offset="0%" stopColor={palette.vinylSplatter} stopOpacity="0.58" />
          <stop offset="45%" stopColor={palette.accentSecondary} stopOpacity="0.32" />
          <stop offset="100%" stopColor={palette.accentWarm} stopOpacity="0.52" />
        </linearGradient>

        {/* Color-splatter radial bloom */}
        <radialGradient id={splatterGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.vinylSplatter} stopOpacity="0.72" />
          <stop offset="58%" stopColor={palette.accentWarm} stopOpacity="0.32" />
          <stop offset="100%" stopColor={palette.vinylBase} stopOpacity="0" />
        </radialGradient>

        {/* Subtle translucent backlight rim */}
        <radialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="transparent" />
          <stop offset="94%" stopColor={palette.vinylSplatter} stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.38" />
        </radialGradient>

        <filter id={blurFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Base translucent colored vinyl body */}
        <circle cx="100" cy="100" r="99" fill={`url(#${baseGradId})`} />

        {/* Organic marbled wax swirls */}
        <g filter={`url(#${blurFilterId})`} opacity="0.82">
          <path
            d="M 8 56 C 46 22, 92 78, 134 38 C 162 12, 188 32, 198 64 C 174 96, 126 66, 94 106 C 62 146, 22 122, 4 90 Z"
            fill={`url(#${marbleGradId})`}
          />
          <path
            d="M 16 144 C 52 172, 108 122, 152 158 C 176 176, 192 148, 196 122 C 164 106, 128 134, 86 116 C 54 102, 24 122, 16 144 Z"
            fill={palette.accentSecondary}
            opacity="0.46"
          />
          <ellipse
            cx="54"
            cy="52"
            rx="38"
            ry="22"
            transform="rotate(-28 54 52)"
            fill={`url(#${splatterGradId})`}
          />
          <ellipse
            cx="148"
            cy="142"
            rx="34"
            ry="19"
            transform="rotate(32 148 142)"
            fill={`url(#${splatterGradId})`}
          />
          <ellipse
            cx="154"
            cy="56"
            rx="24"
            ry="14"
            transform="rotate(42 154 56)"
            fill={palette.accentWarm}
            opacity="0.48"
          />
        </g>

        {/* Crisp vinyl color-splatter radial streaks radiating from center */}
        <g opacity="0.56">
          <path
            d="M 100 100 L 142 18 L 152 24 Z"
            fill={palette.vinylSplatter}
            opacity="0.55"
          />
          <path
            d="M 100 100 L 184 82 L 188 94 Z"
            fill={palette.accentWarm}
            opacity="0.48"
          />
          <path
            d="M 100 100 L 160 174 L 148 182 Z"
            fill={palette.vinylSplatter}
            opacity="0.52"
          />
          <path
            d="M 100 100 L 58 186 L 46 179 Z"
            fill={palette.accentSecondary}
            opacity="0.48"
          />
          <path
            d="M 100 100 L 14 114 L 12 102 Z"
            fill={palette.vinylSplatter}
            opacity="0.5"
          />
          <path
            d="M 100 100 L 36 28 L 46 20 Z"
            fill={palette.accentWarm}
            opacity="0.46"
          />
          {/* Fine splatter wax droplets */}
          <circle cx="48" cy="64" r="3.2" fill={palette.vinylSplatter} opacity="0.72" />
          <circle cx="152" cy="66" r="2.6" fill={palette.vinylSplatter} opacity="0.68" />
          <circle cx="138" cy="154" r="3.4" fill={palette.accentWarm} opacity="0.64" />
          <circle cx="64" cy="146" r="2.8" fill={palette.vinylSplatter} opacity="0.7" />
          <circle cx="168" cy="112" r="2.2" fill={palette.vinylSplatter} opacity="0.65" />
          <circle cx="34" cy="108" r="2.4" fill={palette.accentWarm} opacity="0.6" />
        </g>

        {/* Translucent outer edge light catch */}
        <circle cx="100" cy="100" r="99" fill={`url(#${glowGradId})`} />

        {/* Pressed concentric micro-grooves */}
        {grooveRadii.map((r, idx) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={idx % 3 === 0 ? '#FFFFFF' : '#0E1018'}
            strokeWidth={idx % 4 === 0 ? '0.65' : '0.45'}
            strokeOpacity={idx % 3 === 0 ? '0.14' : '0.26'}
          />
        ))}

        {/* Track band divider grooves */}
        <circle
          cx="100"
          cy="100"
          r="71.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          strokeOpacity="0.16"
        />
        <circle
          cx="100"
          cy="100"
          r="56.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          strokeOpacity="0.16"
        />
        {/* Inner run-out groove ring */}
        <circle
          cx="100"
          cy="100"
          r="43"
          fill="none"
          stroke="#0E1018"
          strokeWidth="1.2"
          strokeOpacity="0.35"
        />
      </g>
    </svg>
  );
}
