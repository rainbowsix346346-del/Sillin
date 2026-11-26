import { ShortClipThreshold, Track } from '../types/music';

export interface ScannedAudioEntry {
  file?: File;
  nativeTrack?: NativeScannedTrack;
  folderPath: string;
}

export interface NativeScannedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  contentUri: string;
  filePath: string;
  folderPath: string;
  albumArtUri: string;
  year: number;
}

export interface ScanResult {
  entries: ScannedAudioEntry[];
  source: 'capacitor-native' | 'directory-picker' | 'fallback-needed' | 'cancelled';
  permissionDenied?: boolean;
}

const AUDIO_FILE_REGEX = /\.(mp3|flac|wav|m4a|ogg|aac|opus)$/i;

interface SillonMediaScannerPlugin {
  scanAllAudio: () => Promise<{
    granted: boolean;
    tracks: NativeScannedTrack[];
  }>;
}

interface CapacitorFilesystemPlugin {
  requestPermissions?: () => Promise<{ publicStorage?: string }>;
  checkPermissions?: () => Promise<{ publicStorage?: string }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  convertFileSrc?: (url: string) => string;
  Plugins?: {
    SillonMediaScanner?: SillonMediaScannerPlugin;
    Filesystem?: CapacitorFilesystemPlugin;
  };
}

interface FileSystemHandleLike {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandleLike extends FileSystemHandleLike {
  kind: 'file';
  getFile: () => Promise<File>;
}

interface FileSystemDirectoryHandleLike extends FileSystemHandleLike {
  kind: 'directory';
  values: () => AsyncIterable<FileSystemHandleLike>;
}

function getCapacitor(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isCapacitorNative(): boolean {
  return Boolean(getCapacitor()?.isNativePlatform?.());
}

export function convertCapacitorUri(uri: string): string {
  const cap = getCapacitor();
  if (cap?.convertFileSrc && uri) {
    return cap.convertFileSrc(uri);
  }
  return uri;
}

export function isSupportedAudioFile(name: string, mimeType = ''): boolean {
  return mimeType.startsWith('audio/') || AUDIO_FILE_REGEX.test(name);
}

/**
 * Requests Android storage/audio permissions via Capacitor plugin
 * when running as a native Android APK; resolves cleanly on web.
 */
export async function requestAudioStoragePermissions(): Promise<{
  granted: boolean;
  mode: 'native' | 'web';
}> {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) {
    return { granted: true, mode: 'web' };
  }

  try {
    if (cap.Plugins?.Filesystem) {
      const fs = cap.Plugins.Filesystem;
      const status = fs.requestPermissions
        ? await fs.requestPermissions()
        : await fs.checkPermissions?.();
      const granted =
        !status ||
        status.publicStorage === 'granted' ||
        status.publicStorage === 'limited';
      return { granted, mode: 'native' };
    }
    return { granted: true, mode: 'native' };
  } catch {
    return { granted: false, mode: 'native' };
  }
}

/**
 * Scans ALL audio tracks across the entire Android device instantly via Android MediaStore
 * (using native SillonMediaScannerPlugin), bypassing slow recursive base64 file reads.
 */
async function scanCapacitorAndroidStorage(): Promise<ScanResult> {
  const cap = getCapacitor();
  const scanner = cap?.Plugins?.SillonMediaScanner;

  if (!scanner) {
    return { entries: [], source: 'fallback-needed' };
  }

  try {
    const res = await scanner.scanAllAudio();
    if (!res.granted) {
      return { entries: [], source: 'capacitor-native', permissionDenied: true };
    }

    const entries: ScannedAudioEntry[] = (res.tracks || []).map((nt) => ({
      nativeTrack: nt,
      folderPath: nt.folderPath || 'Device Music',
    }));

    return { entries, source: 'capacitor-native' };
  } catch {
    return { entries: [], source: 'fallback-needed' };
  }
}

/**
 * Hybrid device scanner:
 * 1. Native Android (Capacitor): requests READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE + POST_NOTIFICATIONS
 *    and queries Android MediaStore for every song on the phone automatically.
 * 2. Web (Chromium / Desktop): uses File System Access API (`showDirectoryPicker`) when available
 *    outside cross-origin iframes, or signals clean fallback to standard folder/file picker.
 */
export async function scanDeviceMusicLibrary(
  options: { autoLaunch?: boolean } = {}
): Promise<ScanResult> {
  if (isCapacitorNative()) {
    return scanCapacitorAndroidStorage();
  }

  // On web, browsers require a user gesture before opening a picker; skip silent auto-launch prompt
  if (options.autoLaunch) {
    return { entries: [], source: 'fallback-needed' };
  }

  const win = window as unknown as {
    showDirectoryPicker?: (opts?: {
      mode?: 'read';
    }) => Promise<FileSystemDirectoryHandleLike>;
  };

  if (typeof win.showDirectoryPicker === 'function') {
    try {
      const rootHandle = await win.showDirectoryPicker({ mode: 'read' });
      const entries: ScannedAudioEntry[] = [];

      const walkDir = async (
        dir: FileSystemDirectoryHandleLike,
        relPath: string,
        depth: number
      ): Promise<void> => {
        if (depth > 5) return;
        for await (const handle of dir.values()) {
          if (handle.kind === 'directory') {
            const nextPath = relPath ? `${relPath}/${handle.name}` : handle.name;
            await walkDir(
              handle as FileSystemDirectoryHandleLike,
              nextPath,
              depth + 1
            );
          } else if (handle.kind === 'file') {
            const file = await (handle as FileSystemFileHandleLike).getFile();
            if (isSupportedAudioFile(file.name, file.type)) {
              entries.push({ file, folderPath: relPath || rootHandle.name });
            }
          }
        }
      };

      await walkDir(rootHandle, rootHandle.name, 0);
      return { entries, source: 'directory-picker' };
    } catch (err) {
      const domErr = err as { name?: string };
      if (domErr?.name === 'AbortError') {
        return { entries: [], source: 'cancelled' };
      }
      return { entries: [], source: 'fallback-needed' };
    }
  }

  return { entries: [], source: 'fallback-needed' };
}

/** Extracts folder path cleanly from a browser File (`webkitRelativePath`) */
export function extractFolderPathFromFile(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (!rel || !rel.includes('/')) return 'Device Music';
  const parts = rel.split('/');
  parts.pop();
  return parts.join('/');
}

/**
 * Pure Voice Note & Folder Filter:
 * Excludes short clips below `minDurationSec` and tracks whose `folderPath`
 * matches any hidden folder rule (e.g. "WhatsApp Audio", "Telegram").
 */
export function filterTracksByLibraryRules(
  tracks: Track[],
  minDurationSec: ShortClipThreshold,
  excludedFolders: string[]
): { visibleTracks: Track[]; hiddenCount: number } {
  const normalizedExcluded = excludedFolders
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);

  const visibleTracks = tracks.filter((track) => {
    if (minDurationSec > 0 && track.duration > 0 && track.duration < minDurationSec) {
      return false;
    }
    if (normalizedExcluded.length > 0 && track.folderPath) {
      const lowerPath = track.folderPath.toLowerCase();
      for (const blocked of normalizedExcluded) {
        if (lowerPath.includes(blocked)) {
          return false;
        }
      }
    }
    return true;
  });

  return {
    visibleTracks,
    hiddenCount: tracks.length - visibleTracks.length,
  };
}

/** Formats cache byte counts cleanly (e.g., "0 KB", "248 KB", "1.4 MB") */
export function formatCacheSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
