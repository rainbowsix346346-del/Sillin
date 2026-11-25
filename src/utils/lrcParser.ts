export interface LyricLine {
  time: number | null;
  text: string;
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: LyricLine[];
}

export function parseLrcOrPlainLyrics(raw?: string | null): ParsedLyrics {
  if (!raw || !raw.trim()) {
    return { isSynced: false, lines: [] };
  }

  const rawLines = raw.split(/\r?\n/);
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const parsedLines: LyricLine[] = [];
  let syncedCount = 0;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ar:...], [ti:...], [al:...], [by:...]
    if (/^\[(ar|ti|al|by|offset|re|ve):.*\]$/i.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const cleanText = trimmed.replace(timeRegex, '').trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msPart = match[3] || '0';
        const ms =
          msPart.length === 1
            ? parseInt(msPart, 10) * 100
            : msPart.length === 2
            ? parseInt(msPart, 10) * 10
            : parseInt(msPart.slice(0, 3), 10);
        const timeInSeconds = minutes * 60 + seconds + ms / 1000;
        parsedLines.push({ time: timeInSeconds, text: cleanText || '♪' });
        syncedCount++;
      }
    } else {
      parsedLines.push({ time: null, text: trimmed });
    }
  }

  if (syncedCount > 0) {
    const syncedOnly = parsedLines
      .filter((l): l is { time: number; text: string } => l.time !== null)
      .sort((a, b) => a.time - b.time);
    return { isSynced: true, lines: syncedOnly };
  }

  return { isSynced: false, lines: parsedLines };
}
