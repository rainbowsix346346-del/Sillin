import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X, Play, Pause, Music2, Upload } from 'lucide-react';
import { Album, SearchFilter, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { formatTime, searchCatalog } from '../utils/musicLogic';
import { Translations } from '../utils/i18n';
import { CoverArt } from './CoverArt';
import { LiveEqualizerBars } from './LiveEqualizerBars';
import { FavoriteHeartButton } from './FavoriteHeartButton';

interface SearchViewProps {
  tracks: Track[];
  albums: Album[];
  currentTrack: Track | null;
  isPlaying: boolean;
  t: Translations;
  onPlayTrack: (track: Track) => void;
  onPlayAlbum: (album: Album) => void;
  onToggleFavorite: (trackId: string) => void;
  onTriggerUploadFiles?: () => void;
}

export function SearchView({
  tracks,
  albums,
  currentTrack,
  isPlaying,
  t,
  onPlayTrack,
  onPlayAlbum,
  onToggleFavorite,
  onTriggerUploadFiles,
}: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const filterChips: { id: SearchFilter; label: string }[] = [
    { id: 'all', label: t.all },
    { id: 'tracks', label: t.tracks },
    { id: 'albums', label: t.albums },
    { id: 'artists', label: t.artists },
  ];

  const results = searchCatalog(tracks, albums, query, filter, onlyFavorites);
  const totalCount =
    results.tracks.length + results.albums.length + results.artists.length;

  return (
    <div className="space-y-6 pb-8">
      <header className="pt-2">
        <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
          {t.searchEyebrow}
        </p>
        <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1">
          {t.searchTitle}
        </h1>
      </header>

      {/* Pill Search Bar */}
      <div className="relative">
        <label htmlFor="sillon-search-input" className="sr-only">
          {t.searchTitle}
        </label>
        <Search
          className="w-5 h-5 text-[#7C84A3] absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="sillon-search-input"
          type="text"
          role="searchbox"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full min-h-[52px] ps-12 pe-12 rounded-full bg-[var(--surface)] accent-transition text-[#1D2238] placeholder:text-[#7C84A3] text-sm sm:text-base font-medium shadow-[inset_0_1px_2px_rgba(29,34,56,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-white transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search query"
            className="w-10 h-10 rounded-full hover:bg-[#1D2238]/6 text-[#545C7A] flex items-center justify-center absolute end-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips & Only Favorites Bouncy Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Search category filters"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {filterChips.map((chip) => {
            const active = filter === chip.id;
            return (
              <motion.button
                key={chip.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-pressed={active}
                onClick={() => setFilter(chip.id)}
                className={`relative min-h-[40px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-white'
                    : 'bg-[var(--surface)] accent-transition text-[#545C7A] hover:text-[#1D2238]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="search-filter-pill"
                    transition={BOUNCY_SPRING}
                    className="absolute inset-0 rounded-full accent-transition"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                <span className="relative z-10">{chip.label}</span>
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
          className="inline-flex items-center gap-3 min-h-[44px] px-3 py-1.5 rounded-full hover:bg-[var(--surface)] accent-transition transition-colors cursor-pointer"
        >
          <span className="text-xs sm:text-sm font-medium text-[#1D2238] whitespace-nowrap">
            {t.onlyFavorites}
          </span>
          <span
            className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center accent-transition"
            style={{
              backgroundColor: onlyFavorites
                ? 'var(--accent)'
                : 'rgba(124, 132, 163, 0.3)',
            }}
          >
            <motion.span
              animate={{ x: onlyFavorites ? 20 : 0 }}
              transition={BOUNCY_SPRING}
              className="w-5 h-5 rounded-full bg-white shadow-sm block rtl:scale-x-[-1]"
            />
          </span>
        </button>
      </div>

      {/* Results List */}
      {tracks.length === 0 ? (
        <div className="vinyl-card p-10 text-center space-y-3">
          <Music2
            className="w-10 h-10 mx-auto text-[#7C84A3]"
            strokeWidth={1.5}
          />
          <h2 className="font-serif text-xl font-semibold text-[#1D2238]">
            {t.collectionEmpty}
          </h2>
          <p className="text-sm text-[#545C7A] max-w-sm mx-auto">
            {t.collectionEmptyDesc}
          </p>
          {onTriggerUploadFiles && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={onTriggerUploadFiles}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-full text-sm font-semibold text-white shadow-sm cursor-pointer accent-transition"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Upload className="w-4 h-4" />
              <span>{t.importFiles}</span>
            </motion.button>
          )}
        </div>
      ) : totalCount === 0 ? (
        <div className="vinyl-card p-10 text-center space-y-3">
          <Music2
            className="w-10 h-10 mx-auto text-[#7C84A3]"
            strokeWidth={1.5}
          />
          <h2 className="font-serif text-xl font-semibold text-[#1D2238]">
            {t.noMatches}
          </h2>
          <p className="text-sm text-[#545C7A]">{t.noMatchesDesc}</p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setQuery('');
              setFilter('all');
              setOnlyFavorites(false);
            }}
            className="min-h-[44px] px-5 py-2 rounded-full bg-white text-sm font-semibold text-[#1D2238] shadow-xs cursor-pointer"
          >
            {t.resetFilters}
          </motion.button>
        </div>
      ) : (
        <div className="space-y-6">
          {results.tracks.length > 0 && (
            <section
              aria-labelledby="search-tracks-heading"
              className="space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <h2
                  id="search-tracks-heading"
                  className="font-serif text-xl font-semibold text-[#1D2238]"
                >
                  {t.tracks}
                </h2>
                <span className="text-xs text-[#7C84A3] tabular-nums">
                  {results.tracks.length} {t.found}
                </span>
              </div>

              <div className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden">
                {results.tracks.map((track, idx) => {
                  const active = currentTrack?.id === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: false, amount: 0.15 }}
                      transition={{
                        ...BOUNCY_SPRING,
                        delay: Math.min(idx, 8) * 0.03,
                      }}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/50 transition-colors will-change-transform"
                    >
                      <button
                        type="button"
                        onClick={() => onPlayTrack(track)}
                        className="flex items-center gap-3.5 min-w-0 flex-1 text-start min-h-[48px] cursor-pointer rounded-xl"
                      >
                        <div className="relative w-12 h-12 rounded-[14px] overflow-hidden shrink-0">
                          <CoverArt
                            src={track.coverUrl}
                            alt={track.title}
                            fallbackGradient={track.fallbackGradient}
                            className="w-full h-full"
                          />
                          {active && (
                            <span className="absolute inset-0 flex items-center justify-center bg-[#1D2238]/40 text-white">
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
                              style={{
                                color: active ? 'var(--accent)' : '#1D2238',
                              }}
                            >
                              {track.title}
                            </span>
                            {active && <LiveEqualizerBars isPlaying={isPlaying} />}
                          </span>
                          <span className="block text-xs text-[#545C7A] truncate mt-0.5">
                            {track.artist} · {track.albumTitle}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#7C84A3] tabular-nums hidden sm:inline">
                          {formatTime(track.duration)}
                        </span>
                        <FavoriteHeartButton
                          isFavorite={track.isFavorite}
                          ariaLabel={
                            track.isFavorite
                              ? `Remove ${track.title} from favorites`
                              : `Add ${track.title} to favorites`
                          }
                          onToggle={() => onToggleFavorite(track.id)}
                          className="w-10 h-10 hover:bg-white/70"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section
              aria-labelledby="search-albums-heading"
              className="space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <h2
                  id="search-albums-heading"
                  className="font-serif text-xl font-semibold text-[#1D2238]"
                >
                  {t.albums}
                </h2>
                <span className="text-xs text-[#7C84A3] tabular-nums">
                  {results.albums.length} {t.found}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {results.albums.map((album, idx) => (
                  <motion.button
                    key={album.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...BOUNCY_SPRING, delay: idx * 0.03 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onPlayAlbum(album)}
                    className="vinyl-card-interactive p-3 text-start cursor-pointer"
                  >
                    <CoverArt
                      src={album.coverUrl}
                      alt={album.title}
                      fallbackGradient={album.fallbackGradient}
                      className="aspect-square w-full rounded-[16px] mb-2.5"
                    />
                    <span className="block font-semibold text-sm text-[#1D2238] truncate">
                      {album.title}
                    </span>
                    <span className="block text-xs text-[#545C7A] truncate mt-0.5">
                      {album.artist} ·{' '}
                      <span className="tabular-nums">{album.year}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {results.artists.length > 0 && (
            <section
              aria-labelledby="search-artists-heading"
              className="space-y-3"
            >
              <h2
                id="search-artists-heading"
                className="font-serif text-xl font-semibold text-[#1D2238]"
              >
                {t.artists}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.artists.map((artist, idx) => (
                  <motion.button
                    key={artist.name}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...BOUNCY_SPRING, delay: idx * 0.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuery(artist.name)}
                    className="vinyl-card-interactive p-3.5 flex items-center gap-3.5 text-start cursor-pointer min-h-[68px]"
                  >
                    <CoverArt
                      src={artist.coverUrl}
                      alt={artist.name}
                      className="w-12 h-12 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block font-semibold text-sm text-[#1D2238] truncate">
                        {artist.name}
                      </span>
                      <span className="block text-xs text-[#545C7A] truncate tabular-nums">
                        {artist.trackCount} · {artist.albumTitle}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
