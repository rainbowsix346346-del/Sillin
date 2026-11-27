import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Music2,
  Compass,
  Upload,
} from 'lucide-react';
import { Album, ExploreMode, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { computeCarouselOffset, formatTime } from '../utils/musicLogic';
import { Translations } from '../utils/i18n';
import { CoverArt } from './CoverArt';
import { LiveEqualizerBars } from './LiveEqualizerBars';
import { FavoriteHeartButton } from './FavoriteHeartButton';

interface ExploreViewProps {
  tracks: Track[];
  albums: Album[];
  currentTrack: Track | null;
  isPlaying: boolean;
  t: Translations;
  onPlayTrack: (track: Track) => void;
  onPlayAlbum: (album: Album) => void;
  onToggleFavorite: (trackId: string) => void;
  onTriggerUploadFiles: () => void;
}

/**
 * Modern "Browse" View (formerly Vinyl Carousel):
 * Floating rounded-square album cards along a smooth elastic curved stack
 * with zero vintage vinyl discs and bouncy spring transitions.
 */
export function ExploreView({
  tracks,
  albums,
  currentTrack,
  isPlaying,
  t,
  onPlayTrack,
  onPlayAlbum,
  onToggleFavorite,
  onTriggerUploadFiles,
}: ExploreViewProps) {
  const [mode, setMode] = useState<ExploreMode>('tracks');
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelLockRef = useRef(0);

  const items = mode === 'tracks' ? tracks : albums;
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  const stepCarousel = (delta: number) => {
    if (items.length === 0) return;
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = performance.now();
    if (now - wheelLockRef.current < 160) return;
    if (Math.abs(e.deltaY) > 18) {
      wheelLockRef.current = now;
      stepCarousel(e.deltaY > 0 ? 1 : -1);
    }
  };

  const handleModeSwitch = (nextMode: ExploreMode) => {
    setMode(nextMode);
    setActiveIndex(0);
  };

  const activeTrack = mode === 'tracks' ? tracks[safeActiveIndex] : null;
  const activeAlbum = mode === 'albums' ? albums[safeActiveIndex] : null;

  if (tracks.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <header className="pt-2">
          <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
            {t.browseEyebrow}
          </p>
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1">
            {t.browseTitle}
          </h1>
        </header>

        <div className="vinyl-card p-10 sm:p-14 text-center space-y-4">
          <Compass
            className="w-12 h-12 mx-auto text-[#7C84A3]"
            strokeWidth={1.5}
          />
          <h2 className="font-serif text-2xl font-semibold text-[#1D2238]">
            {t.browseEmptyTitle}
          </h2>
          <p className="text-sm text-[#545C7A] max-w-sm mx-auto">
            {t.browseEmptyDesc}
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={BOUNCY_SPRING}
            onClick={onTriggerUploadFiles}
            className="min-h-[46px] px-6 py-2.5 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer accent-transition"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Upload className="w-4 h-4" />
            <span>{t.importFiles}</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Toggle Pill ("Tracks" / "Albums") */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
            {t.browseEyebrow}
          </p>
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1">
            {t.browseTitle}
          </h1>
        </div>

        <div
          role="tablist"
          aria-label={t.browseTitle}
          className="inline-flex items-center p-1.5 rounded-full bg-[var(--surface)] accent-transition shadow-[inset_0_1px_2px_rgba(29,34,56,0.06)] self-start sm:self-auto"
        >
          {(
            [
              { id: 'tracks' as ExploreMode, label: t.tracks },
              { id: 'albums' as ExploreMode, label: t.albums },
            ] as const
          ).map((option) => {
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleModeSwitch(option.id)}
                className={`relative min-h-[40px] px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active ? 'text-white' : 'text-[#545C7A] hover:text-[#1D2238]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="explore-mode-pill"
                    transition={BOUNCY_SPRING}
                    className="absolute inset-0 rounded-full accent-transition"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Floating Album Card Stack + Spotlight Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Floating Rounded-Square Stack */}
        <div
          className="lg:col-span-7 vinyl-card p-5 sm:p-6 relative overflow-hidden"
          onWheel={handleWheel}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#545C7A] tabular-nums">
              {safeActiveIndex + 1} / {items.length} · {t.scrollToBrowse}
            </span>
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                transition={BOUNCY_SPRING}
                onClick={() => stepCarousel(-1)}
                aria-label="Previous item"
                className="w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#1D2238] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                transition={BOUNCY_SPRING}
                onClick={() => stepCarousel(1)}
                aria-label="Next item"
                className="w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#1D2238] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="space-y-3 py-2">
            {items.map((item, idx) => {
              const isActive = idx === safeActiveIndex;
              const curve = computeCarouselOffset(idx, safeActiveIndex);
              const isTrackMode = mode === 'tracks';
              const trackItem = isTrackMode ? (item as Track) : null;
              const albumItem = !isTrackMode ? (item as Album) : null;

              const isItemPlaying = isTrackMode
                ? currentTrack?.id === trackItem?.id && isPlaying
                : currentTrack?.albumId === albumItem?.id && isPlaying;

              const title = isTrackMode ? trackItem!.title : albumItem!.title;
              const subtitle = isTrackMode
                ? `${trackItem!.artist} · ${formatTime(trackItem!.duration)}`
                : `${albumItem!.artist} · ${albumItem!.year}`;
              const coverUrl = isTrackMode
                ? trackItem!.coverUrl
                : albumItem!.coverUrl;
              const gradient = isTrackMode
                ? trackItem!.fallbackGradient
                : albumItem!.fallbackGradient;

              return (
                <motion.div
                  key={item.id}
                  animate={{
                    x: Math.max(-18, curve.x * 0.35),
                    scale: curve.scale,
                    opacity: curve.opacity,
                  }}
                  transition={BOUNCY_SPRING}
                  className="will-change-transform"
                >
                  {isActive ? (
                    /* Active Floating Rounded-Square Album Card */
                    <div
                      className="rounded-[24px] p-2.5 pe-3 sm:pe-4 flex items-center gap-2.5 sm:gap-4 bg-white shadow-[0_16px_32px_-12px_rgba(var(--accent-rgb),0.26)] ring-1 ring-black/5"
                      data-testid="active-carousel-pill"
                    >
                      <div className="w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-[16px] sm:rounded-[18px] p-[2px] bg-[var(--surface)] ring-1 ring-white shadow-sm shrink-0 overflow-hidden">
                        <CoverArt
                          src={coverUrl}
                          alt={title}
                          fallbackGradient={gradient}
                          className="w-full h-full rounded-[13px] sm:rounded-[15px]"
                        />
                      </div>

                      <div className="min-w-0 flex-1 text-start">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="font-serif text-base sm:text-xl font-semibold text-[#1D2238] truncate">
                            {title}
                          </h2>
                          {isItemPlaying && <LiveEqualizerBars isPlaying={isPlaying} />}
                        </div>
                        <p className="text-xs text-[#545C7A] truncate mt-0.5 tabular-nums">
                          {subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {trackItem && (
                          <FavoriteHeartButton
                            isFavorite={trackItem.isFavorite}
                            ariaLabel={
                              trackItem.isFavorite
                                ? `Remove ${trackItem.title} from favorites`
                                : `Add ${trackItem.title} to favorites`
                            }
                            onToggle={() => onToggleFavorite(trackItem.id)}
                            className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--surface)] accent-transition"
                          />
                        )}

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.9 }}
                          transition={BOUNCY_SPRING}
                          onClick={() =>
                            isTrackMode
                              ? onPlayTrack(trackItem!)
                              : onPlayAlbum(albumItem!)
                          }
                          aria-label={
                            isItemPlaying ? `Pause ${title}` : `Play ${title}`
                          }
                          className="w-10 h-10 sm:w-auto sm:min-h-[42px] sm:px-5 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-md accent-transition cursor-pointer"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          {isItemPlaying ? (
                            <>
                              <Pause className="w-4 h-4 fill-current" />
                              <span className="hidden sm:inline">{t.playing}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current ms-0.5 sm:ms-0" />
                              <span className="hidden sm:inline">{t.play}</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    /* Neighbor Floating Rounded-Square Album Row */
                    <button
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className="w-full flex items-center gap-3.5 px-3 py-2 rounded-[20px] hover:bg-white/60 transition-colors text-start cursor-pointer min-h-[56px]"
                    >
                      <div className="w-12 h-12 rounded-[14px] overflow-hidden shadow-xs shrink-0 ring-1 ring-white/75">
                        <CoverArt
                          src={coverUrl}
                          alt={title}
                          fallbackGradient={gradient}
                          className="w-full h-full"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="block text-sm font-semibold text-[#1D2238] truncate">
                            {title}
                          </span>
                          {isItemPlaying && <LiveEqualizerBars isPlaying={isPlaying} />}
                        </span>
                        <span className="block text-xs text-[#545C7A] truncate tabular-nums">
                          {subtitle}
                        </span>
                      </div>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Floating Rounded-Square Glass Sleeve Spotlight */}
        <aside className="lg:col-span-5 vinyl-card p-6 flex flex-col items-center text-center">
          <motion.div
            key={(activeTrack || activeAlbum)?.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={BOUNCY_SPRING}
            className="relative w-48 h-48 sm:w-56 sm:h-56 mb-5 rounded-[28px] p-[5px] bg-white/80 ring-1 ring-white/95 shadow-[0_22px_40px_-14px_rgba(var(--accent-rgb),0.36)] overflow-hidden"
          >
            <CoverArt
              src={(activeTrack || activeAlbum)?.coverUrl}
              alt={(activeTrack || activeAlbum)?.title || 'Selected cover'}
              fallbackGradient={(activeTrack || activeAlbum)?.fallbackGradient}
              className="w-full h-full rounded-[23px]"
            />
          </motion.div>

          {activeTrack && (
            <>
              <p className="text-xs font-medium text-[#7C84A3]">
                {activeTrack.albumTitle} ·{' '}
                <span className="tabular-nums">{activeTrack.year}</span>
              </p>
              <h3 className="font-serif text-2xl font-semibold text-[#1D2238] mt-1">
                {activeTrack.title}
              </h3>
              <p className="text-sm text-[#545C7A] mt-1">
                {activeTrack.artist} · {activeTrack.genre}
              </p>
            </>
          )}

          {activeAlbum && (
            <>
              <p className="text-xs font-medium text-[#7C84A3]">
                {activeAlbum.genre} ·{' '}
                <span className="tabular-nums">{activeAlbum.year}</span>
              </p>
              <h3 className="font-serif text-2xl font-semibold text-[#1D2238] mt-1">
                {activeAlbum.title}
              </h3>
              <p className="text-sm text-[#545C7A] mt-1">{activeAlbum.artist}</p>
              <div className="mt-4 w-full space-y-1.5 text-start">
                {tracks
                  .filter((tr) => tr.albumId === activeAlbum.id)
                  .map((tr, i) => (
                    <motion.button
                      key={tr.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onPlayTrack(tr)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white/70 hover:bg-white flex items-center justify-between text-xs text-[#1D2238] transition-colors cursor-pointer min-h-[44px]"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Music2 className="w-3.5 h-3.5 text-[#7C84A3] shrink-0" />
                        <span className="font-medium truncate">
                          {i + 1}. {tr.title}
                        </span>
                      </span>
                      <span className="text-[#7C84A3] tabular-nums ms-2 shrink-0">
                        {formatTime(tr.duration)}
                      </span>
                    </motion.button>
                  ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
