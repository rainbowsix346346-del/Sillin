/**
 * Bridge to the native SillonMediaNotification plugin (Android).
 * Renders the real system media playback notification with play/pause/next/prev actions.
 * All calls are no-ops on web.
 */

interface SillonMediaNotificationPlugin {
  update(options: {
    title: string;
    artist: string;
    album: string;
    playing: boolean;
    artUri: string;
  }): Promise<void>;
  hide(): Promise<void>;
  requestPermissions(): Promise<{ granted: boolean }>;
}

interface SillonCapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    SillonMediaNotification?: SillonMediaNotificationPlugin;
  };
}

function getPlugin(): SillonMediaNotificationPlugin | undefined {
  if (typeof window === 'undefined') return undefined;
  const cap = (window as unknown as { Capacitor?: SillonCapacitorGlobal }).Capacitor;
  return cap?.Plugins?.SillonMediaNotification;
}

export function isNativeNotificationSupported(): boolean {
  return Boolean(getPlugin());
}

let lastSignature = '';

export function syncNativeMediaNotification(payload: {
  title: string;
  artist: string;
  album: string;
  playing: boolean;
  artUri: string;
}): void {
  const plugin = getPlugin();
  if (!plugin) return;
  const signature = `${payload.title}|${payload.artist}|${payload.playing}|${payload.artUri}`;
  if (signature === lastSignature) return;
  lastSignature = signature;
  plugin.update(payload).catch(() => {});
}

export function hideNativeMediaNotification(): void {
  const plugin = getPlugin();
  if (!plugin) return;
  lastSignature = '';
  plugin.hide().catch(() => {});
}

export type NativeMediaAction = 'play' | 'pause' | 'next' | 'prev';

export function addNativeMediaActionListener(
  handler: (action: NativeMediaAction) => void
): () => void {
  const cap = (typeof window !== 'undefined'
    ? (window as unknown as { Capacitor?: SillonCapacitorGlobal & {
        addListener?: (
          plugin: string,
          event: string,
          cb: (data: { action: string }) => void
        ) => Promise<{ remove: () => void }>;
      } })
    : undefined);
  if (!cap?.addListener) return () => {};
  const handle = cap.addListener('SillonMediaNotification', 'action', (data) => {
    if (data && typeof data.action === 'string') {
      handler(data.action as NativeMediaAction);
    }
  });
  return () => {
    handle
      .then((h) => h.remove())
      .catch(() => {});
  };
}
