import { ShortClipThreshold, Track } from '../types/music';

export interface ScannedAudioEntry {
  file: File;
  folderPath: string;
}

export interface ScanResult {
  entries: ScannedAudioEntry[];
  source: 'capacitor-native' | 'directory-picker' | 'fallback-needed' | 'cancelled';
  permissionDenied?: boolean;
}

const AUDIO_FILE_REGEX = /\.(mp3|flac|wav|m4a|ogg|aac|opus)$/i;

interface CapacitorFilesystemPlugin {
  requestPermissions?: () => Promise<{ publicStorage?: string }>;
  checkPermissions?: () => Promise<{ publicStorage?: string }>;
  readdir: (opts: {
    path: string;
    directory: string;
  }) => Promise<{ files: Array<{ name: string; type?: string; uri?: string }> }>;
  readFile: (opts: {
    path: string;
    directory: string;
  }) => Promise<{ data: string }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
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

export function isSupportedAudioFile(name: string, mimeType = ''): boolean {
  return mimeType.startsWith('audio/') || AUDIO_FILE_REGEX.test(name);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function guessAudioMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}

/**
 * Requests Android storage/audio permissions via Capacitor Filesystem plugin
 * when running as a native Android APK; resolves cleanly on web.
 */
export async function requestAudioStoragePermissions(): Promise<{
  granted: boolean;
  mode: 'native' | 'web';
}> {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.() || !cap.Plugins?.Filesystem) {
    return { granted: true, mode: 'web' };
  }

  try {
    const fs = cap.Plugins.Filesystem;
    const status = fs.requestPermissions
      ? await fs.requestPermissions()
      : await fs.checkPermissions?.();
    const granted =
      !status ||
      status.publicStorage === 'granted' ||
      status.publicStorage === 'limited';
    return { granted, mode: 'native' };
  } catch {
    return { granted: false, mode: 'native' };
  }
}

/**
 * Recursively scans Android shared storage folders (Music, Download, Audio)
 * via Capacitor Filesystem plugin when packaged as an Android APK.
 */
async function scanCapacitorAndroidStorage(): Promise<ScanResult> {
  const perm = await requestAudioStoragePermissions();
  if (!perm.granted) {
    return { entries: [], source: 'capacitor-native', permissionDenied: true };
  }

  const fs = getCapacitor()?.Plugins?.Filesystem;
  if (!fs) {
    return { entries: [], source: 'fallback-needed' };
  }

  const entries: ScannedAudioEntry[] = [];
  const rootFolders = ['Music', 'Download', 'Audio', 'Podcasts'];

  const walk = async (dirPath: string, depth: number): Promise<void> => {
    if (depth > 4) return;
    try {
      const listing = await fs.readdir({
        path: dirPath,
        directory: 'EXTERNAL_STORAGE',
      });
      for (const item of listing.files) {
        const nextPath = dirPath ? `${dirPath}/${item.name}` : item.name;
        if (item.type === 'directory') {
          await walk(nextPath, depth + 1);
        } else if (isSupportedAudioFile(item.name)) {
          try {
            const raw = await fs.readFile({
              path: nextPath,
              directory: 'EXTERNAL_STORAGE',
            });
            const bytes = base64ToUint8Array(raw.data);
            const safeBuffer = new Uint8Array(bytes.byteLength);
            safeBuffer.set(bytes);
            const file = new File([safeBuffer], item.name, {
              type: guessAudioMime(item.name),
            });
            entries.push({ file, folderPath: dirPath });
          } catch {
            // Skip unreadable file cleanly
          }
        }
      }
    } catch {
      // Directory may not exist on device; continue cleanly
    }
  };

  for (const root of rootFolders) {
    await walk(root, 0);
  }

  return { entries, source: 'capacitor-native' };
}

/**
 * Hybrid device scanner:
 * 1. Native Android (Capacitor): requests storage permissions and scans device folders.
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
      // SecurityError in iframes or unsupported -> cleanly fall back to <input> picker
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
