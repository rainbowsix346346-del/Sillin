import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Mic2,
  Music2,
  ListMusic,
  FileAudio,
  Layers,
  Calendar,
  Heart,
  AudioLines,
  ArrowLeft,
  FolderSearch,
  Upload,
  Play,
  Pause,
} from 'lucide-react';
import { Album, LibraryCategoryId, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { formatTime, getLibraryCounts } from '../utils/musicLogic';
import { Translations } from '../utils/i18n';
import { CoverArt } from './CoverArt';
import { LiveEqualizerBars } from './LiveEqualizerBars';
import { FavoriteHeartButton } from './FavoriteHeartButton';

interface LibraryViewProps {
  tracks: Track[];
  albums: Album[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isScanning: boolean;
  t: Translations;
  onPlayTrack: (track: Track) => void;
  onPlayAlbum: (album: Album) => void;
  onToggleFavorite: (trackId: string) => void;
  onScanDeviceMusic: () => void;
  onTriggerUpload: () => void;
}

const CATEGORY_META: {
  id: LibraryCategoryId;
  icon: typeof LayoutGrid;
  tint: string;
}[] = [
  { id: 'albums', icon: LayoutGrid, tint: '#4A558F' },
  { id: 'artists', icon: Mic2, tint: '#6A5B8E' },
  { id: 'genres', icon: AudioLines, tint: '#4F6F60' },
  { id: 'tracks', icon: Music2, tint: '#546696' },
  { id: 'playlists', icon: ListMusic, tint: '#7A536C' },
  { id: 'files', icon: FileAudio, tint: '#8A673D' },
  { id: 'compilations', icon: Layers, tint: '#5B6A82' },
  { id: 'years', icon: Calendar, tint: '#7A6352' },
  { id: 'favorites', icon: Heart, tint: '#9A5466' },
];

export function LibraryView({
  tracks,
  albums,
  currentTrack,
  isPlaying,
  isScanning,
  t,
  onPlayTrack,
  onPlayAlbum,
  onToggleFavorite,
  onScanDeviceMusic,
  onTriggerUpload,
}: LibraryViewProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<LibraryCategoryId | null>(null);
  const [pulsingId, setPulsingId] = useState<LibraryCategoryId | null>(null);

  const counts = getLibraryCounts(tracks, albums);

  const handleCategoryTap = (id: LibraryCategoryId) => {
    setPulsingId(id);
    window.setTimeout(() => {
      setPulsingId(null);
      setSelectedCategory(id);
    }, 130);
  };

  const renderCategoryItems = (cat: LibraryCategoryId) => {
    if (cat === 'albums') {
      if (albums.length === 0) {
        return (
          <div className="vinyl-card p-8 text-center space-y-4">
            <LayoutGrid
              className="w-10 h-10 mx-auto text-[#7C84A3]"
              strokeWidth={1.6}
            />
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#1D2238]">
                {t.noAlbumsYet}
              </h3>
              <p className="text-sm text-[#545C7A] mt-1">{t.noAlbumsDesc}</p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={onTriggerUpload}
              className="min-h-[44px] px-5 py-2.5 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer accent-transition"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Upload className="w-4 h-4" />
              <span>{t.importFiles}</span>
            </motion.button>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((album) => (
            <motion.button
              key={album.id}
              type="button"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              transition={BOUNCY_SPRING}
              onClick={() => onPlayAlbum(album)}
              className="vinyl-card-interactive p-3 text-start cursor-pointer"
            >
              <CoverArt
                src={album.coverUrl}
                alt={album.title}
                fallbackGradient={album.fallbackGradient}
                className="aspect-square w-full rounded-[18px] mb-3"
              />
              <span className="block font-semibold text-sm text-[#1D2238] truncate">
                {album.title}
              </span>
              <span className="block text-xs text-[#545C7A] truncate mt-0.5">
                {album.artist} · {album.year}
              </span>
            </motion.button>
          ))}
        </div>
      );
    }

    const filteredTracks = (() => {
      switch (cat) {
        case 'favorites':
          return tracks.filter((tr) => tr.isFavorite);
        case 'files':
          return tracks.filter((tr) => tr.isLocalFile);
        case 'compilations':
          return tracks.filter((tr) => tr.isCompilation);
        case 'years':
          return [...tracks].sort((a, b) => b.year - a.year);
        case 'genres':
          return [...tracks].sort((a, b) => a.genre.localeCompare(b.genre));
        case 'artists':
          return [...tracks].sort((a, b) => a.artist.localeCompare(b.artist));
        case 'playlists':
          return tracks.filter((tr) => Boolean(tr.playlistName));
        default:
          return tracks;
      }
    })();

    if (filteredTracks.length === 0) {
      return (
        <div className="vinyl-card p-8 text-center space-y-4">
          <FileAudio
            className="w-10 h-10 mx-auto text-[#7C84A3]"
            strokeWidth={1.6}
          />
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1D2238]">
              {t.noFilesYet}
            </h3>
            <p className="text-sm text-[#545C7A] mt-1">{t.noFilesDesc}</p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={BOUNCY_SPRING}
            onClick={onTriggerUpload}
            className="min-h-[44px] px-5 py-2.5 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer accent-transition"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Upload className="w-4 h-4" />
            <span>{t.importFiles}</span>
          </motion.button>
        </div>
      );
    }

    return (
      <div
        className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden"
        data-testid="library-track-list"
      >
        {filteredTracks.map((track, idx) => {
          const active = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.15 }}
              transition={{
                ...BOUNCY_SPRING,
                delay: Math.min(idx, 8) * 0.035,
              }}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/45 transition-colors will-change-transform"
            >
              <button
                type="button"
                onClick={() => onPlayTrack(track)}
                className="flex items-center gap-3.5 min-w-0 flex-1 text-start min-h-[48px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
              >
                <div className="relative w-12 h-12 rounded-[14px] overflow-hidden shrink-0">
                  <CoverArt
                    src={track.coverUrl}
                    alt={track.title}
                    fallbackGradient={track.fallbackGradient}
                    className="w-full h-full"
                  />
                  {active && (
                    <span
                      className="absolute inset-0 flex items-center justify-center bg-[#1D2238]/40 text-white"
                      aria-hidden="true"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="block font-semibold text-sm truncate"
                      style={{ color: active ? 'var(--accent)' : '#1D2238' }}
                    >
                      {track.title}
                    </span>
                    {active && <LiveEqualizerBars isPlaying={isPlaying} />}
                  </span>
                  <span className="block text-xs text-[#545C7A] truncate mt-0.5">
                    {track.artist} · {track.genre} ·{' '}
                    <span className="tabular-nums">{track.year}</span>
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[#7C84A3] tabular-nums hidden sm:inline">
                  {formatTime(track.duration)}
                </span>
                <FavoriteHeartButton
                  isFavorite={track.isFavorite}
                  testId={`library-heart-${track.id}`}
                  ariaLabel={
                    track.isFavorite
                      ? `Unfavorite ${track.title}`
                      : `Favorite ${track.title}`
                  }
                  onToggle={() => onToggleFavorite(track.id)}
                  className="w-10 h-10 hover:bg-white/70"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
            {t.libraryEyebrow}
          </p>
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1">
            {t.libraryTitle}
          </h1>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.92 }}
          transition={BOUNCY_SPRING}
          onClick={onScanDeviceMusic}
          disabled={isScanning}
          className="min-h-[44px] px-4 py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm accent-transition disabled:opacity-65"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <FolderSearch className="w-4 h-4" />
          <span>{isScanning ? t.scanningDevice : t.scanDeviceMusic}</span>
        </motion.button>
      </header>

      <AnimatePresence mode="wait">
        {selectedCategory ? (
          <motion.div
            key={`detail-${selectedCategory}`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={BOUNCY_SPRING}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedCategory(null)}
                className="min-h-[44px] px-4 rounded-full bg-[var(--surface)] accent-transition hover:bg-white text-sm font-semibold text-[#1D2238] inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{t.allCategories}</span>
              </motion.button>
              <span className="font-serif text-xl font-semibold text-[#1D2238]">
                {t.categories[selectedCategory]}
              </span>
            </div>

            {renderCategoryItems(selectedCategory)}
          </motion.div>
        ) : (
          <motion.div
            key="bento-grid"
            initial={{ opacity: 0.85, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={BOUNCY_SPRING}
            className="space-y-6"
          >
            {/* 3x3 Bento Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {CATEGORY_META.map((category) => {
                const Icon = category.icon;
                const isPulsing = pulsingId === category.id;
                const count = counts[category.id];
                const label = t.categories[category.id];

                return (
                  <motion.button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryTap(category.id)}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.92 }}
                    transition={BOUNCY_SPRING}
                    className="vinyl-card-interactive group p-4 sm:p-5 flex flex-col items-start justify-between min-h-[114px] sm:min-h-[134px] text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <motion.div
                      animate={
                        isPulsing
                          ? {
                              rotate: [0, -14, 14, -6, 0],
                              scale: [1, 1.18, 1.04, 1],
                            }
                          : { rotate: 0, scale: 1 }
                      }
                      transition={{ duration: 0.36, ease: 'easeInOut' }}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-white/85 flex items-center justify-center shadow-xs"
                    >
                      <Icon
                        className="w-5 h-5 sm:w-6 sm:h-6 accent-transition"
                        style={{ color: category.tint }}
                        strokeWidth={1.9}
                      />
                    </motion.div>

                    <div className="mt-3 w-full">
                      <span className="block font-semibold text-sm sm:text-base text-[#1D2238] truncate">
                        {label}
                      </span>
                      <span className="block text-xs text-[#7C84A3] mt-0.5 tabular-nums">
                        {count} {count === 1 ? t.itemSingular : t.itemPlural}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Tactile Local File Import Card */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={BOUNCY_SPRING}
              onClick={onTriggerUpload}
              className="w-full vinyl-card-interactive p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-start border border-dashed border-[#4A558F]/25 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 accent-transition"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#1D2238]">
                    {t.dropZoneTitle}
                  </h2>
                  <p className="text-xs text-[#545C7A] mt-0.5">
                    {t.dropZoneDesc}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-4 py-2 rounded-full bg-white text-[#1D2238] whitespace-nowrap shrink-0 shadow-xs">
                {t.browseFiles}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
