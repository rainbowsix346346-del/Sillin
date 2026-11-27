import { motion } from 'motion/react';
import {
  Play,
  Pause,
  Upload,
  FolderUp,
  FolderSearch,
  Music2,
} from 'lucide-react';
import { AccentPalette, Album, Track } from '../types/music';
import { BOUNCY_SPRING } from '../data/catalog';
import { formatTime } from '../utils/musicLogic';
import { Translations } from '../utils/i18n';
import { CoverArt } from './CoverArt';
import { LiveEqualizerBars } from './LiveEqualizerBars';
import { FavoriteHeartButton } from './FavoriteHeartButton';

interface HomeViewProps {
  albums: Album[];
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  accentPalette: AccentPalette;
  isScanning: boolean;
  t: Translations;
  onPlayAlbum: (album: Album) => void;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onScanDeviceMusic: () => void;
  onTriggerUploadFiles: () => void;
  onTriggerUploadFolder: () => void;
}

export function HomeView({
  albums,
  tracks,
  currentTrack,
  isPlaying,
  accentPalette,
  isScanning,
  t,
  onPlayAlbum,
  onPlayTrack,
  onToggleFavorite,
  onScanDeviceMusic,
  onTriggerUploadFiles,
  onTriggerUploadFolder,
}: HomeViewProps) {
  const recentlyAdded = [...albums].sort((a, b) => b.addedOrder - a.addedOrder);

  return (
    <div className="space-y-7 pb-8" data-testid="home-view">
      {/* Editorial Header ("For You" / "برای شما") */}
      <header className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
            {t.forYouEyebrow}
          </p>
          <h1
            className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1"
            style={{ textWrap: 'balance' }}
          >
            {t.forYouTitle}
          </h1>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.92 }}
          transition={BOUNCY_SPRING}
          onClick={onScanDeviceMusic}
          disabled={isScanning}
          aria-label={t.scanDeviceMusic}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 accent-transition shadow-sm cursor-pointer disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: '0 8px 20px -6px rgba(var(--accent-rgb), 0.45)',
          }}
        >
          <FolderSearch className="w-4 h-4" strokeWidth={2.2} />
          <span>{isScanning ? t.scanningDevice : t.scanDeviceMusic}</span>
        </motion.button>
      </header>

      {/* Clean Modern Empty State when no local tracks are imported yet */}
      {tracks.length === 0 ? (
        <section
          aria-label={t.forYouTitle}
          data-testid="empty-vinyl-shelf"
          className="vinyl-card p-7 sm:p-14 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Soft ambient color wash */}
          <div
            className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-70"
            style={{
              background: `radial-gradient(circle, ${accentPalette.auraPrimary} 0%, transparent 70%)`,
            }}
            aria-hidden="true"
          />

          {/* Modern Floating Glass Album Art Emblem */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
            className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-[30px] p-[5px] bg-white/75 ring-1 ring-white/95 shadow-[0_22px_44px_-14px_rgba(var(--accent-rgb),0.4)] mb-7 will-change-transform"
            aria-hidden="true"
          >
            <div
              className="w-full h-full rounded-[25px] flex flex-col items-center justify-center relative overflow-hidden accent-transition"
              style={{
                background: `linear-gradient(135deg, ${accentPalette.accent} 0%, ${accentPalette.accentSecondary} 56%, ${accentPalette.accentWarm} 100%)`,
              }}
            >
              <div className="w-16 h-16 rounded-[20px] bg-white/22 flex items-center justify-center text-white shadow-inner">
                <Music2 className="w-8 h-8" strokeWidth={2} />
              </div>
              <div className="flex items-end gap-1 mt-3.5 h-4">
                {[0.55, 1, 0.72, 0.9, 0.5].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-white/85"
                    style={{ height: `${h * 14}px` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <h2
            className="relative z-10 font-serif text-2xl sm:text-3xl font-semibold text-[#1D2238] max-w-md"
            style={{ textWrap: 'balance' }}
          >
            {t.emptyHeadline}
          </h2>
          <p className="relative z-10 text-sm text-[#545C7A] max-w-md mt-2.5 leading-relaxed">
            {t.emptySubtitle}
          </p>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mt-7">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={onTriggerUploadFiles}
              className="min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2.5 shadow-md accent-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 12px 26px -8px rgba(var(--accent-rgb), 0.5)',
              }}
            >
              <Upload className="w-4 h-4" strokeWidth={2.2} />
              <span>{t.importFiles}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={onTriggerUploadFolder}
              className="min-h-[48px] px-5 py-3 rounded-full bg-white/90 hover:bg-white text-sm font-semibold text-[#1D2238] inline-flex items-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <FolderUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>{t.importFolder}</span>
            </motion.button>
          </div>
        </section>
      ) : (
        <>
          {/* Recent Albums — Compact Horizontal Scroll Row (150px–165px cards) */}
          {recentlyAdded.length > 0 && (
            <section aria-labelledby="recently-added-heading">
              <div className="flex items-baseline justify-between mb-3.5">
                <h2
                  id="recently-added-heading"
                  className="font-serif text-2xl font-semibold text-[#1D2238]"
                >
                  {t.recentlyAdded}
                </h2>
                <span className="text-xs text-[#7C84A3] tabular-nums">
                  {recentlyAdded.length}
                </span>
              </div>

              <div
                data-testid="recent-albums-row"
                className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {recentlyAdded.map((album) => {
                  const isAlbumActive = currentTrack?.albumId === album.id;
                  return (
                    <motion.button
                      key={album.id}
                      type="button"
                      onClick={() => onPlayAlbum(album)}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.94 }}
                      transition={BOUNCY_SPRING}
                      data-testid="recent-album-card"
                      className="vinyl-card-interactive group shrink-0 w-[156px] max-w-[162px] p-2.5 text-start flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <div className="relative aspect-square w-full mb-2.5 rounded-[16px] p-[2px] bg-white/75 ring-1 ring-white/85 shadow-sm overflow-hidden">
                        <CoverArt
                          src={album.coverUrl}
                          alt={album.title}
                          fallbackGradient={album.fallbackGradient}
                          className="w-full h-full rounded-[14px]"
                        />

                        <span
                          className="absolute bottom-2 end-2 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-200 group-hover:scale-105 accent-transition"
                          style={{ backgroundColor: 'var(--accent)' }}
                          aria-hidden="true"
                        >
                          {isAlbumActive && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ms-0.5" />
                          )}
                        </span>
                      </div>

                      <span className="font-semibold text-sm text-[#1D2238] leading-snug truncate">
                        {album.title}
                      </span>
                      <span className="text-xs text-[#545C7A] mt-0.5 truncate">
                        {album.artist}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Direct List of User's Tracks right below Recent Albums */}
          <section aria-labelledby="home-tracks-heading" className="space-y-3.5">
            <div className="flex items-baseline justify-between">
              <h2
                id="home-tracks-heading"
                className="font-serif text-2xl font-semibold text-[#1D2238]"
              >
                {t.yourTracks}
              </h2>
              <span className="text-xs text-[#7C84A3] tabular-nums">
                {tracks.length} {t.tracksReady}
              </span>
            </div>

            <div
              data-testid="home-tracks-list"
              className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden"
            >
              {tracks.map((track, idx) => {
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#7C84A3] tabular-nums">
                        {formatTime(track.duration)}
                      </span>
                      <FavoriteHeartButton
                        isFavorite={track.isFavorite}
                        ariaLabel={track.title}
                        onToggle={() => onToggleFavorite(track.id)}
                        className="w-10 h-10 hover:bg-white/70"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
