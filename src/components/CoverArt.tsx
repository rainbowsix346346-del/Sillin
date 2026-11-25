import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtProps {
  src?: string;
  alt: string;
  fallbackGradient?: [string, string];
  className?: string;
  imgClassName?: string;
}

export function CoverArt({
  src,
  alt,
  fallbackGradient = ['#4A558F', '#8E98C9'],
  className = '',
  imgClassName = '',
}: CoverArtProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{
          background: `linear-gradient(135deg, ${fallbackGradient[0]}, ${fallbackGradient[1]})`,
        }}
        role="img"
        aria-label={alt}
      >
        <Disc3 className="w-1/3 h-1/3 text-white/75" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#E5E8F4] ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
