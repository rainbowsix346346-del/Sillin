import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Upload } from 'lucide-react';
import {
  AccentPalette,
  Album,
  AppSettings,
  EqBands,
  LyricLine,
  RepeatMode,
  TabId,
  Track,
} from './types/music';
import {
  BOUNCY_SPRING,
  DEFAULT_SETTINGS,
  detectDefaultLanguage,
  EQ_PRESETS,
  SLEEVE_PALETTES,
} from './data/catalog';
import { vinylAudioEngine } from './audio/audioEngine';
import {
  applyAccentPaletteToRoot,
  computeRefinedAccentFromRgb,
  DEFAULT_ACCENT_PALETTE,
  extractAccentFromImage,
} from './utils/colorExtract';
import {
  getNextTrackIndex,
  getPrevTrackIndex,
} from './utils/musicLogic';
import { extractAudioMetadataFromFile } from './utils/id3Parser';
import {
  extractFolderPathFromFile,
  filterTracksByLibraryRules,
  isSupportedAudioFile,
  scanDeviceMusicLibrary,
  ScannedAudioEntry,
} from './utils/localScanner';
import { TRANSLATIONS } from './utils/i18n';
import {
  registerMediaSessionHandlers,
  syncMediaSessionMetadata,
  syncMediaSessionPlaybackState,
  syncMediaSessionPositionState,
} from './utils/mediaSession';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { LibraryView } from './components/LibraryView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { MiniPlayer } from './components/MiniPlayer';
import { BottomNav } from './components/BottomNav';
import { NowPlayingSheet } from './components/NowPlayingSheet';
import { StartupSplash } from './components/StartupSplash';

const SETTINGS_STORAGE_KEY = 'sillon_settings_v2';

function loadSavedSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        language: detectDefaultLanguage(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
    if (!merged.languageManuallySet) {
      merged.language = detectDefaultLanguage();
    }
    return merged;
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      language: detectDefaultLanguage(),
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackDirection, setTrackDirection] = useState<1 | -1>(1);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const [settings, setSettings] = useState<AppSettings>(loadSavedSettings);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);
  const [eqBands, setEqBands] = useState<EqBands>(EQ_PRESETS['Warm Analog']);
  const [outputId, setOutputId] = useState('builtin');
  const [accentPalette, setAccentPalette] = useState<AccentPalette>(
    DEFAULT_ACCENT_PALETTE
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioUrlsRef = useRef<string[]>([]);
  const coverUrlsRef = useRef<string[]>([]);

  const t = TRANSLATIONS[settings.language];

  // Sync HTML language & RTL/LTR document direction immediately
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === 'fa' ? 'rtl' : 'ltr';
  }, [settings.language]);

  // Persist user settings cleanly to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  // Sync crossfade setting to audio engine
  useEffect(() => {
    vinylAudioEngine.setCrossfadeSeconds(settings.crossfadeSeconds);
  }, [settings.crossfadeSeconds]);

  // Apply Voice Note & Folder Filter live across the library
  const { visibleTracks, hiddenCount: hiddenTracksCount } = useMemo(
    () =>
      filterTracksByLibraryRules(
        tracks,
        settings.minTrackDurationSec,
        settings.excludedFolders
      ),
    [tracks, settings.minTrackDurationSec, settings.excludedFolders]
  );

  const visibleAlbums = useMemo(() => {
    const visibleTrackSet = new Set(visibleTracks.map((tr) => tr.id));
    return albums
      .map((alb) => ({
        ...alb,
        trackIds: alb.trackIds.filter((id) => visibleTrackSet.has(id)),
      }))
      .filter((alb) => alb.trackIds.length > 0);
  }, [albums, visibleTracks]);

  const coverCacheBytes = useMemo(
    () => tracks.reduce((sum, tr) => sum + (tr.coverBytes || 0), 0),
    [tracks]
  );

  const trackMap = useMemo(() => {
    const map = new Map<string, Track>();
    for (const tr of visibleTracks) map.set(tr.id, tr);
    return map;
  }, [visibleTracks]);

  const queue = useMemo(
    () =>
      queueIds
        .map((id) => trackMap.get(id))
        .filter((tr): tr is Track => Boolean(tr)),
    [queueIds, trackMap]
  );

  const currentTrack = useMemo(
    () =>
      currentTrackId
        ? trackMap.get(currentTrackId) || visibleTracks[0] || null
        : visibleTracks[0] || null,
    [trackMap, currentTrackId, visibleTracks]
  );

  const showNotice = useCallback((msg: string) => {
    setUploadNotice(msg);
    window.setTimeout(() => setUploadNotice(null), 3200);
  }, []);

  // Dynamic 3-color palette morphing from active cover art
  useEffect(() => {
    let cancelled = false;

    if (!currentTrack) {
      const basePalette = computeRefinedAccentFromRgb(
        74,
        85,
        143,
        undefined,
        0,
        settings.themeIntensity
      );
      setAccentPalette(basePalette);
      applyAccentPaletteToRoot(basePalette);
      return;
    }

    const album = visibleAlbums.find((a) => a.id === currentTrack.albumId);
    const fallbackHex =
      currentTrack.accentSeedHex || album?.accentHint || '#4A558F';

    extractAccentFromImage(
      currentTrack.coverUrl,
      fallbackHex,
      currentTrack.moodShiftDeg || 0,
      settings.themeIntensity
    ).then((palette) => {
      if (!cancelled) {
        setAccentPalette(palette);
        applyAccentPaletteToRoot(palette);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentTrack?.id,
    currentTrack?.coverUrl,
    currentTrack?.albumId,
    currentTrack?.moodShiftDeg,
    currentTrack?.accentSeedHex,
    visibleAlbums,
    settings.themeIntensity,
  ]);

  // Sync track & playback state into Web Audio engine
  useEffect(() => {
    if (!currentTrack) {
      vinylAudioEngine.reset();
      setDuration(0);
      setCurrentTime(0);
      return;
    }
    vinylAudioEngine.loadTrack(currentTrack, isPlaying);
    vinylAudioEngine.setPlaybackRate(playbackRate);
    vinylAudioEngine.setEqBands(eqBands);
    setDuration(currentTrack.duration);
    setCurrentTime(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      vinylAudioEngine.play();
    } else {
      vinylAudioEngine.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    vinylAudioEngine.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    vinylAudioEngine.setEqBands(eqBands);
  }, [eqBands]);

  useEffect(() => {
    return () => {
      vinylAudioEngine.dispose();
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      coverUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    const idx = queue.findIndex((tr) => tr.id === currentTrack?.id);
    const nextIdx = getNextTrackIndex(
      Math.max(0, idx),
      queue.length,
      repeat,
      shuffle
    );
    if (nextIdx === -1) {
      setIsPlaying(false);
      vinylAudioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      setTrackDirection(1);
      setCurrentTrackId(nextTrack.id);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [queue, currentTrack?.id, repeat, shuffle]);

  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;
    const idx = queue.findIndex((tr) => tr.id === currentTrack?.id);
    const prevIdx = getPrevTrackIndex(Math.max(0, idx), queue.length, currentTime);
    if (prevIdx === idx) {
      vinylAudioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      setTrackDirection(-1);
      setCurrentTrackId(prevTrack.id);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [queue, currentTrack?.id, currentTime]);

  // Playback progress polling loop
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const timer = window.setInterval(() => {
      const cur = vinylAudioEngine.getCurrentTime();
      const dur = vinylAudioEngine.getDuration();
      setCurrentTime(cur);
      if (dur > 0) setDuration(dur);

      if (cur >= dur && dur > 0) {
        if (repeat === 'one' || queue.length <= 1) {
          vinylAudioEngine.seek(0);
          setCurrentTime(0);
        } else {
          handleNext();
        }
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [isPlaying, currentTrack, repeat, queue.length, handleNext]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepMinutesLeft === null) return;
    const id = window.setInterval(() => {
      setSleepMinutesLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [sleepMinutesLeft]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape' && isNowPlayingOpen) {
        setIsNowPlayingOpen(false);
      } else if (e.code === 'Space' && !isTyping && currentTrack) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNowPlayingOpen, currentTrack]);

  const ingestAudioEntries = useCallback(
    async (entries: ScannedAudioEntry[]) => {
      const validEntries = entries.filter((entry) =>
        isSupportedAudioFile(entry.file.name, entry.file.type)
      );
      if (!validEntries.length) return;

      const addedTracks: Track[] = [];
      const albumGroups = new Map<string, Album>();

      for (let i = 0; i < validEntries.length; i++) {
        const { file, folderPath } = validEntries[i];
        const objectUrl = URL.createObjectURL(file);
        audioUrlsRef.current.push(objectUrl);

        const meta = await extractAudioMetadataFromFile(file);
        if (meta.coverUrl) {
          coverUrlsRef.current.push(meta.coverUrl);
        }

        const measuredDuration = await new Promise<number>((resolve) => {
          let settled = false;
          const finish = (val: number) => {
            if (!settled) {
              settled = true;
              resolve(val);
            }
          };
          const probe = new Audio();
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => {
            finish(
              Number.isFinite(probe.duration) && probe.duration > 0
                ? Math.round(probe.duration)
                : 180
            );
          };
          probe.onerror = () => finish(180);
          window.setTimeout(() => finish(180), 1400);
          probe.src = objectUrl;
        });

        const paletteSeed =
          SLEEVE_PALETTES[(tracks.length + i) % SLEEVE_PALETTES.length];
        const albumKey = `${meta.albumTitle.toLowerCase()}::${meta.artist.toLowerCase()}`;
        const albumId = `alb-${albumKey.replace(/[^a-z0-9]+/g, '-')}`;
        const trackId = `local-${Date.now()}-${i}`;

        const track: Track = {
          id: trackId,
          title: meta.title,
          artist: meta.artist,
          albumId,
          albumTitle: meta.albumTitle,
          genre: meta.genre,
          year: meta.year,
          duration: measuredDuration,
          coverUrl: meta.coverUrl,
          coverBytes: meta.coverBytes,
          fallbackGradient: paletteSeed.gradient,
          accentSeedHex: paletteSeed.hex,
          isFavorite: false,
          isLocalFile: true,
          folderPath,
          audioUrl: objectUrl,
          addedOrder: tracks.length + i + 1,
          moodShiftDeg: (i % 4) * 11,
          lyrics: [],
        };

        addedTracks.push(track);

        const existingGroup = albumGroups.get(albumId);
        if (existingGroup) {
          existingGroup.trackIds.push(trackId);
          if (!existingGroup.coverUrl && meta.coverUrl) {
            existingGroup.coverUrl = meta.coverUrl;
          }
        } else {
          albumGroups.set(albumId, {
            id: albumId,
            title: meta.albumTitle,
            artist: meta.artist,
            year: meta.year,
            genre: meta.genre,
            coverUrl: meta.coverUrl,
            fallbackGradient: paletteSeed.gradient,
            trackIds: [trackId],
            accentHint: paletteSeed.hex,
            addedOrder: albums.length + albumGroups.size + 1,
            rediscoverNote: 'Local audio library',
          });
        }
      }

      setTracks((prev) => [...addedTracks, ...prev]);
      setAlbums((prev) => {
        const merged = new Map<string, Album>();
        for (const a of prev) {
          merged.set(a.id, { ...a, trackIds: [...a.trackIds] });
        }
        for (const [id, incoming] of albumGroups.entries()) {
          const existing = merged.get(id);
          if (existing) {
            existing.trackIds = [...incoming.trackIds, ...existing.trackIds];
            if (!existing.coverUrl && incoming.coverUrl) {
              existing.coverUrl = incoming.coverUrl;
            }
          } else {
            merged.set(id, incoming);
          }
        }
        return Array.from(merged.values());
      });

      setQueueIds((prev) => [...addedTracks.map((tr) => tr.id), ...prev]);
      setCurrentTrackId(addedTracks[0].id);
      setCurrentTime(0);
      setIsPlaying(true);

      showNotice(
        addedTracks.length === 1
          ? `“${addedTracks[0].title}”`
          : `+${addedTracks.length}`
      );
    },
    [tracks.length, albums.length, showNotice]
  );

  const ingestLocalFileList = useCallback(
    async (fileList: FileList | File[]) => {
      const entries: ScannedAudioEntry[] = Array.from(fileList).map((file) => ({
        file,
        folderPath: extractFolderPathFromFile(file),
      }));
      await ingestAudioEntries(entries);
    },
    [ingestAudioEntries]
  );

  // Fast 1.6s startup splash fade-out + automatic background music scan on launch
  useEffect(() => {
    let active = true;
    const splashTimer = window.setTimeout(() => {
      if (active) setShowSplash(false);
    }, 1600);

    void scanDeviceMusicLibrary({ autoLaunch: true }).then((result) => {
      if (active && result.entries.length > 0) {
        void ingestAudioEntries(result.entries);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(splashTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hybrid Scan Device Music button handler (Native Capacitor -> Web Directory Picker -> Fallback input)
  const handleScanDeviceMusic = useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await scanDeviceMusicLibrary({ autoLaunch: false });
      if (result.entries.length > 0) {
        await ingestAudioEntries(result.entries);
      } else if (result.source === 'fallback-needed') {
        folderInputRef.current?.click();
      }
    } finally {
      setIsScanning(false);
    }
  }, [ingestAudioEntries]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (currentTrack?.id === track.id) {
        setIsPlaying((p) => !p);
        return;
      }
      if (!queueIds.includes(track.id)) {
        setQueueIds((prev) => [track.id, ...prev]);
      }
      setCurrentTrackId(track.id);
      setCurrentTime(0);
      setIsPlaying(true);
    },
    [currentTrack?.id, queueIds]
  );

  const handlePlayAlbum = useCallback(
    (album: Album) => {
      const albumTracks = visibleTracks.filter((tr) => tr.albumId === album.id);
      if (!albumTracks.length) return;
      if (currentTrack?.albumId === album.id && isPlaying) {
        setIsPlaying(false);
        return;
      }
      setQueueIds(albumTracks.map((tr) => tr.id));
      setCurrentTrackId(albumTracks[0].id);
      setCurrentTime(0);
      setIsPlaying(true);
    },
    [visibleTracks, currentTrack?.albumId, isPlaying]
  );

  const handleToggleFavorite = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((tr) =>
        tr.id === trackId ? { ...tr, isFavorite: !tr.isFavorite } : tr
      )
    );
  }, []);

  const handleUpdateTrackLyrics = useCallback(
    (trackId: string, lyrics: LyricLine[]) => {
      setTracks((prev) =>
        prev.map((tr) => (tr.id === trackId ? { ...tr, lyrics } : tr))
      );
    },
    []
  );

  const handleUpdateTrackMeta = useCallback(
    (
      trackId: string,
      updates: {
        title: string;
        artist: string;
        albumTitle: string;
        coverUrl?: string;
        coverBytes?: number;
      }
    ) => {
      if (updates.coverUrl) {
        coverUrlsRef.current.push(updates.coverUrl);
      }
      setTracks((prev) =>
        prev.map((tr) =>
          tr.id === trackId
            ? {
                ...tr,
                title: updates.title,
                artist: updates.artist,
                albumTitle: updates.albumTitle,
                ...(updates.coverUrl
                  ? {
                      coverUrl: updates.coverUrl,
                      coverBytes: updates.coverBytes ?? tr.coverBytes,
                    }
                  : {}),
              }
            : tr
        )
      );
      setAlbums((prev) =>
        prev.map((alb) =>
          alb.trackIds.includes(trackId)
            ? {
                ...alb,
                title: updates.albumTitle,
                artist: updates.artist,
                ...(updates.coverUrl ? { coverUrl: updates.coverUrl } : {}),
              }
            : alb
        )
      );
      showNotice(t.savedTagNotice);
    },
    [showNotice, t.savedTagNotice]
  );

  const handleClearCoverCache = useCallback(() => {
    coverUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    coverUrlsRef.current = [];
    setTracks((prev) =>
      prev.map((tr) => ({ ...tr, coverUrl: '', coverBytes: 0 }))
    );
    setAlbums((prev) => prev.map((alb) => ({ ...alb, coverUrl: '' })));
    showNotice(t.cacheClearedNotice);
  }, [showNotice, t.cacheClearedNotice]);

  const handleSeek = useCallback(
    (seconds: number) => {
      vinylAudioEngine.seek(seconds);
      setCurrentTime(seconds);
      const dur = vinylAudioEngine.getDuration() || duration;
      if (dur > 0) {
        syncMediaSessionPositionState(dur, seconds, playbackRate);
      }
    },
    [duration, playbackRate]
  );

  const handleStop = useCallback(() => {
    vinylAudioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    const dur = vinylAudioEngine.getDuration() || duration;
    if (dur > 0) {
      syncMediaSessionPositionState(dur, 0, playbackRate);
    }
  }, [duration, playbackRate]);

  // Lock Screen & Notification Shade Media Controls (Web MediaSession API)
  useEffect(() => {
    syncMediaSessionMetadata(currentTrack);
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.albumTitle,
    currentTrack?.coverUrl,
  ]);

  useEffect(() => {
    syncMediaSessionPlaybackState(isPlaying, Boolean(currentTrack));
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (!currentTrack || duration <= 0) return;
    syncMediaSessionPositionState(duration, currentTime, playbackRate);
  }, [currentTrack?.id, duration, Math.floor(currentTime), playbackRate, isPlaying]);

  useEffect(() => {
    return registerMediaSessionHandlers({
      onPlay: () => {
        if (currentTrack) setIsPlaying(true);
      },
      onPause: () => setIsPlaying(false),
      onStop: handleStop,
      onNextTrack: handleNext,
      onPreviousTrack: handlePrev,
      onSeekTo: (timeSeconds) => handleSeek(timeSeconds),
      onSeekBy: (delta) => {
        const cur = vinylAudioEngine.getCurrentTime();
        const dur = vinylAudioEngine.getDuration() || duration;
        handleSeek(Math.max(0, Math.min(dur, cur + delta)));
      },
    });
  }, [currentTrack, duration, handleNext, handlePrev, handleSeek, handleStop]);

  const handleCycleRepeat = useCallback(() => {
    setRepeat((prev) =>
      prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
    );
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void ingestLocalFileList(e.dataTransfer.files);
    }
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <LayoutGroup>
      <div
        className="min-h-screen text-[#1D2238] relative overflow-x-hidden accent-transition"
        style={{ backgroundColor: 'var(--canvas)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-active-accent={accentPalette.accent}
        data-active-canvas={accentPalette.canvasBg}
        data-active-surface={accentPalette.cardSurface}
        data-app-lang={settings.language}
      >
        {/* Subtle Ambient Top Tint Shifting Dynamically */}
        <div
          className="pointer-events-none fixed top-0 inset-x-0 h-[360px] -z-0 opacity-90"
          style={{
            background: `radial-gradient(ellipse 85% 65% at 50% -12%, rgba(${accentPalette.rgb.join(',')}, 0.17) 0%, transparent 74%)`,
          }}
          aria-hidden="true"
        />

        {/* Hidden Multi-File Picker (MP3 / FLAC / WAV / M4A / OGG) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.opus"
          multiple
          className="hidden"
          data-testid="audio-file-input"
          aria-label="Import local audio files input"
          onChange={(e) => {
            if (e.target.files?.length) {
              void ingestLocalFileList(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {/* Hidden Folder Picker */}
        <input
          ref={folderInputRef}
          type="file"
          accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.opus"
          multiple
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          className="hidden"
          data-testid="audio-folder-input"
          aria-label="Import local audio folder input"
          onChange={(e) => {
            if (e.target.files?.length) {
              void ingestLocalFileList(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {/* Main Responsive Content Canvas with Elastic Micro Spring-Jump Transitions (0.94 -> 1.02 -> 1.0) */}
        <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-40">
          <motion.div
            key={`tab-${activeTab}`}
            initial={{ opacity: 0.4, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={BOUNCY_SPRING}
          >
            {activeTab === 'home' && (
              <HomeView
                albums={visibleAlbums}
                tracks={visibleTracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                accentPalette={accentPalette}
                isScanning={isScanning}
                t={t}
                onPlayAlbum={handlePlayAlbum}
                onPlayTrack={handlePlayTrack}
                onToggleFavorite={handleToggleFavorite}
                onScanDeviceMusic={() => void handleScanDeviceMusic()}
                onTriggerUploadFiles={() => fileInputRef.current?.click()}
                onTriggerUploadFolder={() => folderInputRef.current?.click()}
              />
            )}

            {activeTab === 'explore' && (
              <ExploreView
                tracks={visibleTracks}
                albums={visibleAlbums}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                t={t}
                onPlayTrack={handlePlayTrack}
                onPlayAlbum={handlePlayAlbum}
                onToggleFavorite={handleToggleFavorite}
                onTriggerUploadFiles={() => fileInputRef.current?.click()}
              />
            )}

            {activeTab === 'library' && (
              <LibraryView
                tracks={visibleTracks}
                albums={visibleAlbums}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                isScanning={isScanning}
                t={t}
                onPlayTrack={handlePlayTrack}
                onPlayAlbum={handlePlayAlbum}
                onToggleFavorite={handleToggleFavorite}
                onScanDeviceMusic={() => void handleScanDeviceMusic()}
                onTriggerUpload={() => fileInputRef.current?.click()}
              />
            )}

            {activeTab === 'search' && (
              <SearchView
                tracks={visibleTracks}
                albums={visibleAlbums}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                t={t}
                onPlayTrack={handlePlayTrack}
                onPlayAlbum={handlePlayAlbum}
                onToggleFavorite={handleToggleFavorite}
                onTriggerUploadFiles={() => fileInputRef.current?.click()}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                allTracks={tracks}
                hiddenTracksCount={hiddenTracksCount}
                coverCacheBytes={coverCacheBytes}
                isScanning={isScanning}
                t={t}
                onUpdateSettings={handleUpdateSettings}
                onUpdateTrackMeta={handleUpdateTrackMeta}
                onClearCoverCache={handleClearCoverCache}
                onScanDeviceMusic={() => void handleScanDeviceMusic()}
              />
            )}
          </motion.div>
        </main>

        {/* Status Toast positioned cleanly above floating bottom dock so headers are never obscured */}
        <AnimatePresence>
          {uploadNotice && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={BOUNCY_SPRING}
              role="status"
              className={`fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white shadow-lg whitespace-nowrap ${
                currentTrack && !isNowPlayingOpen
                  ? 'bottom-[152px] sm:bottom-[162px]'
                  : 'bottom-[88px] sm:bottom-[98px]'
              }`}
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {uploadNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag & Drop Audio Overlay */}
        <AnimatePresence>
          {isDraggingFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[var(--canvas)]/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <div className="vinyl-card max-w-md w-full p-10 text-center border-2 border-dashed border-[var(--accent)] space-y-3">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Upload className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#1D2238]">
                  {t.dropTitle}
                </h2>
                <p className="text-sm text-[#545C7A]">{t.dropSubtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent Floating Mini-Player + iOS Dynamic Island Floating Capsule Nav */}
        <div
          className="fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3.5 sm:px-6 pb-3 sm:pb-5 pt-3 accent-transition"
          style={{
            background: `linear-gradient(to top, var(--canvas) 35%, rgba(var(--surface-rgb), 0.72) 72%, transparent 100%)`,
          }}
        >
          <div className="w-full max-w-[490px] mx-auto space-y-2.5 pointer-events-auto">
            {!isNowPlayingOpen && (
              <MiniPlayer
                track={currentTrack}
                isPlaying={isPlaying}
                progressRatio={progressRatio}
                accentPalette={accentPalette}
                onExpand={() => setIsNowPlayingOpen(true)}
                onPrev={handlePrev}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onNext={handleNext}
                onStop={handleStop}
              />
            )}
            <BottomNav
              activeTab={activeTab}
              t={t}
              onSelectTab={setActiveTab}
            />
          </div>
        </div>

        {/* Fixed 100dvh Now Playing Sheet with Glass Cover / Turntable / Ambient Wave & Instant Floating Utility Popups */}
        <NowPlayingSheet
          isOpen={isNowPlayingOpen}
          track={currentTrack}
          trackDirection={trackDirection}
          queue={queue}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          shuffle={shuffle}
          repeat={repeat}
          playbackRate={playbackRate}
          sleepMinutesLeft={sleepMinutesLeft}
          eqBands={eqBands}
          outputId={outputId}
          accentPalette={accentPalette}
          settings={settings}
          t={t}
          onClose={() => setIsNowPlayingOpen(false)}
          onChangeMode={(mode) =>
            handleUpdateSettings({ nowPlayingMode: mode })
          }
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onToggleShuffle={() => setShuffle((s) => !s)}
          onCycleRepeat={handleCycleRepeat}
          onToggleFavorite={handleToggleFavorite}
          onSelectTrack={(tr) => {
            const curIdx = queue.findIndex((q) => q.id === currentTrack?.id);
            const nextIdx = queue.findIndex((q) => q.id === tr.id);
            setTrackDirection(nextIdx >= curIdx ? 1 : -1);
            setCurrentTrackId(tr.id);
            setCurrentTime(0);
            setIsPlaying(true);
          }}
          onSetPlaybackRate={setPlaybackRate}
          onSetSleepTimer={setSleepMinutesLeft}
          onChangeEq={setEqBands}
          onSelectOutput={setOutputId}
          onUpdateTrackLyrics={handleUpdateTrackLyrics}
        />

        {/* Fast 1.6s Startup Splash Overlay */}
        <StartupSplash visible={showSplash} t={t} />
      </div>
    </LayoutGroup>
  );
}
