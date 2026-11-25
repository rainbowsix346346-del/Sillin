import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Languages,
  Filter,
  Tag,
  HardDrive,
  Sparkles,
  ImagePlus,
  Check,
  Plus,
  X,
  FolderSearch,
  Disc3,
  AudioLines,
  Info,
} from 'lucide-react';
import {
  AppLanguage,
  AppSettings,
  NowPlayingMode,
  ShortClipThreshold,
  Track,
} from '../types/music';
import { BOUNCY_SPRING, POPUP_SPRING } from '../data/catalog';
import { Translations } from '../utils/i18n';
import { formatCacheSize } from '../utils/localScanner';
import { CoverArt } from './CoverArt';

interface SettingsViewProps {
  settings: AppSettings;
  allTracks: Track[];
  hiddenTracksCount: number;
  coverCacheBytes: number;
  isScanning: boolean;
  t: Translations;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onUpdateTrackMeta: (
    trackId: string,
    updates: {
      title: string;
      artist: string;
      albumTitle: string;
      coverUrl?: string;
      coverBytes?: number;
    }
  ) => void;
  onClearCoverCache: () => void;
  onScanDeviceMusic: () => void;
}

const PRESET_FOLDERS = ['WhatsApp Audio', 'Telegram', 'Voice Recorder', 'Call Recordings'];

/**
 * Lightweight, Essential Settings View (Zero Bloat):
 * 1. Auto Language Detection & Switcher (English / فارسی RTL)
 * 2. Voice Note & Folder Filter (Short clips + hidden folders)
 * 3. Track Tag & Cover Editor (Title, Artist, Album, custom gallery cover)
 * 4. Storage Cache & About Sillon (Cache size + Clear Cache + Logo v1.0.0 + What's New popup)
 */
export function SettingsView({
  settings,
  allTracks,
  hiddenTracksCount,
  coverCacheBytes,
  isScanning,
  t,
  onUpdateSettings,
  onUpdateTrackMeta,
  onClearCoverCache,
  onScanDeviceMusic,
}: SettingsViewProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    allTracks[0]?.id || ''
  );
  const [draftTitle, setDraftTitle] = useState('');
  const [draftArtist, setDraftArtist] = useState('');
  const [draftAlbum, setDraftAlbum] = useState('');
  const [draftCoverUrl, setDraftCoverUrl] = useState<string | undefined>(
    undefined
  );
  const [draftCoverBytes, setDraftCoverBytes] = useState<number | undefined>(
    undefined
  );
  const [customFolderInput, setCustomFolderInput] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const coverFileRef = useRef<HTMLInputElement>(null);

  const activeEditTrack =
    allTracks.find((tr) => tr.id === selectedTrackId) || allTracks[0] || null;

  useEffect(() => {
    if (activeEditTrack) {
      setSelectedTrackId(activeEditTrack.id);
      setDraftTitle(activeEditTrack.title);
      setDraftArtist(activeEditTrack.artist);
      setDraftAlbum(activeEditTrack.albumTitle);
      setDraftCoverUrl(undefined);
      setDraftCoverBytes(undefined);
    }
  }, [activeEditTrack?.id]);

  const allFolderChips = Array.from(
    new Set([...PRESET_FOLDERS, ...settings.excludedFolders])
  );

  const toggleExcludedFolder = (folder: string) => {
    const exists = settings.excludedFolders.includes(folder);
    const next = exists
      ? settings.excludedFolders.filter((f) => f !== folder)
      : [...settings.excludedFolders, folder];
    onUpdateSettings({ excludedFolders: next });
  };

  const handleAddCustomFolder = () => {
    const trimmed = customFolderInput.trim();
    if (!trimmed) return;
    if (!settings.excludedFolders.includes(trimmed)) {
      onUpdateSettings({
        excludedFolders: [...settings.excludedFolders, trimmed],
      });
    }
    setCustomFolderInput('');
  };

  const handlePickCustomCover = (file: File) => {
    const url = URL.createObjectURL(file);
    setDraftCoverUrl(url);
    setDraftCoverBytes(file.size);
  };

  const handleSaveTagEdit = () => {
    if (!activeEditTrack) return;
    onUpdateTrackMeta(activeEditTrack.id, {
      title: draftTitle.trim() || activeEditTrack.title,
      artist: draftArtist.trim() || activeEditTrack.artist,
      albumTitle: draftAlbum.trim() || activeEditTrack.albumTitle,
      ...(draftCoverUrl
        ? { coverUrl: draftCoverUrl, coverBytes: draftCoverBytes }
        : {}),
    });
    setDraftCoverUrl(undefined);
    setDraftCoverBytes(undefined);
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2000);
  };

  const modeOptions: { id: NowPlayingMode; label: string; icon: typeof Sparkles }[] = [
    { id: 'glass-cover', label: t.modeGlassCover, icon: Sparkles },
    { id: 'turntable', label: t.modeTurntable, icon: Disc3 },
    { id: 'ambient-wave', label: t.modeAmbientWave, icon: AudioLines },
  ];

  const clipOptions: { val: ShortClipThreshold; label: string }[] = [
    { val: 0, label: t.filterOff },
    { val: 30, label: t.under30s },
    { val: 60, label: t.under60s },
  ];

  const langOptions: { id: AppLanguage; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'fa', label: 'فارسی' },
  ];

  return (
    <div className="space-y-6 pb-8 max-w-3xl mx-auto" data-testid="settings-view">
      {/* Header + Quick Scan Action */}
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#7C84A3]">
            {t.settingsEyebrow}
          </p>
          <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.12] font-semibold tracking-[-0.02em] text-[#1D2238] mt-1">
            {t.settingsTitle}
          </h1>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          transition={BOUNCY_SPRING}
          onClick={onScanDeviceMusic}
          disabled={isScanning}
          className="min-h-[42px] px-4 py-2 rounded-full text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm accent-transition cursor-pointer disabled:opacity-65"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <FolderSearch className="w-4 h-4" />
          <span>{isScanning ? t.scanningDevice : t.scanDeviceMusic}</span>
        </motion.button>
      </header>

      {/* 1. Auto Language Detection & Switcher + Synced Centerpiece Mode */}
      <section aria-labelledby="settings-lang-heading" className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Languages className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2
            id="settings-lang-heading"
            className="text-xs font-semibold tracking-wide text-[#545C7A]"
          >
            {t.languageSection}
          </h2>
        </div>

        <div className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-sm font-semibold text-[#1D2238]">
                {t.languageLabel}
              </span>
              <span className="block text-xs text-[#545C7A] mt-0.5">
                {t.languageHint}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t.languageLabel}
              className="inline-flex items-center p-1 rounded-full bg-white/80 shadow-xs self-start sm:self-auto"
            >
              {langOptions.map((opt) => {
                const active = settings.language === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`lang-btn-${opt.id}`}
                    onClick={() =>
                      onUpdateSettings({
                        language: opt.id,
                        languageManuallySet: true,
                      })
                    }
                    className={`relative min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      active ? 'text-white' : 'text-[#545C7A] hover:text-[#1D2238]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="settings-lang-pill"
                        transition={BOUNCY_SPRING}
                        className="absolute inset-0 rounded-full accent-transition"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Synced Now Playing Centerpiece Mode Switcher */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-sm font-semibold text-[#1D2238]">
                {t.nowPlayingDefaultLabel}
              </span>
              <span className="block text-xs text-[#545C7A] mt-0.5">
                {t.nowPlayingDefaultHint}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t.nowPlayingDefaultLabel}
              className="inline-flex items-center p-1 rounded-full bg-white/80 shadow-xs self-start sm:self-auto max-w-full"
            >
              {modeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = settings.nowPlayingMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onUpdateSettings({ nowPlayingMode: opt.id })}
                    className={`relative min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer transition-colors duration-150 ${
                      active ? 'text-white' : 'text-[#545C7A] hover:text-[#1D2238]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="settings-centerpiece-pill"
                        transition={BOUNCY_SPRING}
                        className="absolute inset-0 rounded-full accent-transition"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <Icon
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0 ${
                        active ? 'inline-block' : 'hidden sm:inline-block'
                      }`}
                    />
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Voice Note & Folder Filter */}
      <section aria-labelledby="settings-filter-heading" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2
              id="settings-filter-heading"
              className="text-xs font-semibold tracking-wide text-[#545C7A]"
            >
              {t.filterSection}
            </h2>
          </div>
          {hiddenTracksCount > 0 && (
            <span className="text-xs font-medium text-[#7C84A3] tabular-nums">
              {hiddenTracksCount} {t.hiddenTracksNotice}
            </span>
          )}
        </div>

        <div className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-sm font-semibold text-[#1D2238]">
                {t.shortClipsLabel}
              </span>
              <span className="block text-xs text-[#545C7A] mt-0.5">
                {t.shortClipsHint}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t.shortClipsLabel}
              className="inline-flex items-center p-1 rounded-full bg-white/80 shadow-xs self-start sm:self-auto"
            >
              {clipOptions.map((opt) => {
                const active = settings.minTrackDurationSec === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      onUpdateSettings({ minTrackDurationSec: opt.val })
                    }
                    className={`relative min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      active ? 'text-white' : 'text-[#545C7A] hover:text-[#1D2238]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="settings-clip-pill"
                        transition={BOUNCY_SPRING}
                        className="absolute inset-0 rounded-full accent-transition"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <div>
              <span className="block text-sm font-semibold text-[#1D2238]">
                {t.hiddenFoldersLabel}
              </span>
              <span className="block text-xs text-[#545C7A] mt-0.5">
                {t.hiddenFoldersHint}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {allFolderChips.map((folder) => {
                const blocked = settings.excludedFolders.includes(folder);
                return (
                  <motion.button
                    key={folder}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    transition={BOUNCY_SPRING}
                    aria-pressed={blocked}
                    onClick={() => toggleExcludedFolder(folder)}
                    className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ${
                      blocked
                        ? 'text-white shadow-xs'
                        : 'bg-white/80 text-[#545C7A] hover:text-[#1D2238]'
                    }`}
                    style={
                      blocked ? { backgroundColor: 'var(--accent)' } : undefined
                    }
                  >
                    {blocked && <Check className="w-3.5 h-3.5" />}
                    <span>{folder}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customFolderInput}
                onChange={(e) => setCustomFolderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomFolder();
                }}
                placeholder={t.addFolderPlaceholder}
                className="flex-1 min-h-[42px] px-4 rounded-full bg-white/85 text-xs sm:text-sm text-[#1D2238] placeholder:text-[#7C84A3] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={BOUNCY_SPRING}
                onClick={handleAddCustomFolder}
                className="min-h-[42px] px-4 rounded-full bg-white text-xs font-semibold text-[#1D2238] shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span>{t.addFolderBtn}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Track Tag & Cover Editor */}
      <section aria-labelledby="settings-tag-heading" className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Tag className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2
            id="settings-tag-heading"
            className="text-xs font-semibold tracking-wide text-[#545C7A]"
          >
            {t.tagEditorSection}
          </h2>
        </div>

        <div className="vinyl-card p-4 sm:p-5">
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload custom cover image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handlePickCustomCover(file);
                e.target.value = '';
              }
            }}
          />

          {!activeEditTrack ? (
            <p className="text-sm text-[#545C7A] text-center py-3">
              {t.tagEditorEmpty}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Track Picker */}
              <div>
                <label
                  htmlFor="tag-editor-track-select"
                  className="block text-xs font-semibold text-[#545C7A] mb-1.5"
                >
                  {t.selectTrackLabel}
                </label>
                <select
                  id="tag-editor-track-select"
                  value={activeEditTrack.id}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="w-full min-h-[44px] px-4 rounded-2xl bg-white/85 text-sm font-medium text-[#1D2238] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                >
                  {allTracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title} — {tr.artist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Custom Cover Preview + Picker */}
                <div className="flex sm:flex-col items-center gap-3 shrink-0">
                  <CoverArt
                    src={draftCoverUrl ?? activeEditTrack.coverUrl}
                    alt={draftTitle || activeEditTrack.title}
                    fallbackGradient={activeEditTrack.fallbackGradient}
                    className="w-24 h-24 rounded-[20px] shadow-sm ring-1 ring-white/80"
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={BOUNCY_SPRING}
                    onClick={() => coverFileRef.current?.click()}
                    className="min-h-[38px] px-3.5 rounded-full bg-white text-xs font-semibold text-[#1D2238] shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImagePlus
                      className="w-3.5 h-3.5"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span>{t.uploadCustomCover}</span>
                  </motion.button>
                </div>

                {/* Metadata Inputs */}
                <div className="flex-1 w-full space-y-2.5">
                  <div>
                    <label
                      htmlFor="tag-title-input"
                      className="block text-[11px] font-semibold text-[#545C7A] mb-1"
                    >
                      {t.fieldTitle}
                    </label>
                    <input
                      id="tag-title-input"
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full min-h-[40px] px-3.5 rounded-2xl bg-white/85 text-sm text-[#1D2238] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="tag-artist-input"
                        className="block text-[11px] font-semibold text-[#545C7A] mb-1"
                      >
                        {t.fieldArtist}
                      </label>
                      <input
                        id="tag-artist-input"
                        type="text"
                        value={draftArtist}
                        onChange={(e) => setDraftArtist(e.target.value)}
                        className="w-full min-h-[40px] px-3.5 rounded-2xl bg-white/85 text-sm text-[#1D2238] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tag-album-input"
                        className="block text-[11px] font-semibold text-[#545C7A] mb-1"
                      >
                        {t.fieldAlbum}
                      </label>
                      <input
                        id="tag-album-input"
                        type="text"
                        value={draftAlbum}
                        onChange={(e) => setDraftAlbum(e.target.value)}
                        className="w-full min-h-[40px] px-3.5 rounded-2xl bg-white/85 text-sm text-[#1D2238] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {savedFeedback && (
                      <span className="text-xs font-semibold text-[#4D6D5E]">
                        {t.savedTagNotice}
                      </span>
                    )}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      transition={BOUNCY_SPRING}
                      onClick={handleSaveTagEdit}
                      className="min-h-[40px] px-5 rounded-full text-xs font-semibold text-white shadow-sm accent-transition cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      {t.saveTagChanges}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Storage Cache & About Sillon */}
      <section aria-labelledby="settings-storage-heading" className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <HardDrive className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2
            id="settings-storage-heading"
            className="text-xs font-semibold tracking-wide text-[#545C7A]"
          >
            {t.storageAboutSection}
          </h2>
        </div>

        <div className="vinyl-card divide-y divide-[#1D2238]/6 overflow-hidden">
          {/* Cached Cover Data Size + Clear Cache */}
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1D2238]">
                  {t.coverCacheLabel}
                </span>
                <span
                  data-testid="cover-cache-size"
                  className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-white/85 text-[#1D2238]"
                >
                  {formatCacheSize(coverCacheBytes)}
                </span>
              </div>
              <span className="block text-xs text-[#545C7A] mt-0.5">
                {t.coverCacheHint}
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={onClearCoverCache}
              className="min-h-[40px] px-4 rounded-full bg-white hover:bg-white/95 text-xs font-semibold text-[#1D2238] shadow-xs cursor-pointer"
            >
              {t.clearCacheBtn}
            </motion.button>
          </div>

          {/* About Sillon Card (Logo + v1.0.0 + What's New Spring Popup) */}
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* High-Res Sillon App Icon Vector */}
              <img
                src="/app-icon.svg"
                alt="Sillon app icon"
                data-testid="settings-app-icon"
                className="w-12 h-12 rounded-[14px] shrink-0 shadow-sm ring-1 ring-[#1D2238]/6 select-none"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-semibold text-[#1D2238]">
                    Sillon
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/85 text-[#545C7A]">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-[#545C7A] mt-0.5 leading-snug">
                  {t.aboutTagline}
                </p>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={BOUNCY_SPRING}
              onClick={() => setShowWhatsNew(true)}
              data-testid="whats-new-button"
              className="min-h-[40px] px-4 rounded-full bg-white text-xs font-semibold text-[#1D2238] shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>{t.whatsNewBtn}</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* What's New Bouncy Frosted-Glass Spring Popup */}
      <AnimatePresence>
        {showWhatsNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhatsNew(false)}
              className="fixed inset-0 bg-[#1D2238]/20"
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.whatsNewTitle}
              data-testid="whats-new-modal"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={POPUP_SPRING}
              className="relative z-10 w-full max-w-md frosted-modal rounded-[28px] p-6 ring-1 ring-white/90 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-xl font-semibold text-[#1D2238]">
                  {t.whatsNewTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowWhatsNew(false)}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#545C7A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ul className="space-y-2.5">
                {t.whatsNewItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-[#1D2238] leading-relaxed"
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-2 shrink-0"
                      style={{ backgroundColor: 'var(--accent)' }}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex justify-end pt-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={BOUNCY_SPRING}
                  onClick={() => setShowWhatsNew(false)}
                  className="min-h-[42px] px-5 rounded-full text-xs font-semibold text-white cursor-pointer accent-transition"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {t.closeBtn}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
