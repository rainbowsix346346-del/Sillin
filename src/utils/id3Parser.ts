import { parseLocalFileName } from './musicLogic';

export interface ParsedBinaryMetadata {
  title: string;
  artist: string;
  albumTitle: string;
  genre: string;
  year: number;
  coverData?: Uint8Array;
  coverMime?: string;
}

export interface ExtractedAudioMetadata {
  title: string;
  artist: string;
  albumTitle: string;
  genre: string;
  year: number;
  coverUrl: string;
  coverBytes: number;
}

function readSynchsafeInt(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

function readUint24BE(view: DataView, offset: number): number {
  return (
    (view.getUint8(offset) << 16) |
    (view.getUint8(offset + 1) << 8) |
    view.getUint8(offset + 2)
  );
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = '';
  const end = Math.min(view.byteLength, offset + length);
  for (let i = offset; i < end; i++) {
    out += String.fromCharCode(view.getUint8(i));
  }
  return out;
}

function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length < 2) return '';
  const encoding = bytes[0];
  const payload = bytes.slice(1);
  try {
    if (encoding === 1) {
      // UTF-16 with BOM
      if (payload.length >= 2 && payload[0] === 0xfe && payload[1] === 0xff) {
        return new TextDecoder('utf-16be')
          .decode(payload.slice(2))
          .replace(/\0/g, '')
          .trim();
      }
      if (payload.length >= 2 && payload[0] === 0xff && payload[1] === 0xfe) {
        return new TextDecoder('utf-16le')
          .decode(payload.slice(2))
          .replace(/\0/g, '')
          .trim();
      }
      return new TextDecoder('utf-16')
        .decode(payload)
        .replace(/\0/g, '')
        .trim();
    }
    if (encoding === 2) {
      return new TextDecoder('utf-16be')
        .decode(payload)
        .replace(/\0/g, '')
        .trim();
    }
    if (encoding === 3) {
      return new TextDecoder('utf-8')
        .decode(payload)
        .replace(/\0/g, '')
        .trim();
    }
    return new TextDecoder('iso-8859-1')
      .decode(payload)
      .replace(/\0/g, '')
      .trim();
  } catch {
    return '';
  }
}

function detectImageMime(bytes: Uint8Array, declaredMime?: string): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return 'image/webp';
    }
  }
  if (declaredMime && declaredMime.startsWith('image/')) return declaredMime;
  if (declaredMime?.toUpperCase() === 'PNG') return 'image/png';
  return 'image/jpeg';
}

function decodeApicFrame(
  bytes: Uint8Array,
  isV22: boolean
): { data: Uint8Array; mime: string } | null {
  if (bytes.length < 12) return null;
  const encoding = bytes[0];
  let idx = 1;
  let mime = '';

  if (isV22) {
    // ID3v2.2 PIC uses 3-byte image format ("JPG" / "PNG")
    mime = String.fromCharCode(bytes[1], bytes[2], bytes[3]);
    idx = 4;
  } else {
    while (idx < bytes.length && bytes[idx] !== 0) {
      mime += String.fromCharCode(bytes[idx]);
      idx++;
    }
    idx += 1; // null terminator
  }

  idx += 1; // picture type byte

  if (encoding === 1 || encoding === 2) {
    while (
      idx + 1 < bytes.length &&
      !(bytes[idx] === 0 && bytes[idx + 1] === 0)
    ) {
      idx += 2;
    }
    idx += 2;
  } else {
    while (idx < bytes.length && bytes[idx] !== 0) {
      idx += 1;
    }
    idx += 1;
  }

  if (idx >= bytes.length) return null;
  const imgData = bytes.slice(idx);
  if (imgData.length < 16) return null;
  return {
    data: imgData,
    mime: detectImageMime(imgData, mime),
  };
}

function parseId3v2(view: DataView, buffer: ArrayBuffer, result: ParsedBinaryMetadata): void {
  const majorVersion = view.getUint8(3);
  const flags = view.getUint8(5);
  const tagSize = readSynchsafeInt(view, 6);
  const limit = Math.min(buffer.byteLength, 10 + tagSize);

  let offset = 10;
  // Skip extended header if present (bit 6)
  if ((flags & 0x40) !== 0 && offset + 4 <= limit) {
    const extSize =
      majorVersion === 4
        ? readSynchsafeInt(view, offset)
        : view.getUint32(offset, false);
    offset += majorVersion === 4 ? extSize : extSize + 4;
  }

  if (majorVersion === 2) {
    // ID3v2.2: 3-char frame ID + 3-byte size
    while (offset + 6 < limit) {
      const frameId = readAscii(view, offset, 3);
      if (!/^[A-Z0-9]{3}$/.test(frameId)) break;
      const frameSize = readUint24BE(view, offset + 3);
      offset += 6;
      if (frameSize <= 0 || offset + frameSize > limit) break;

      const frameBytes = new Uint8Array(buffer, offset, frameSize);
      if (frameId === 'TT2') {
        const val = decodeTextFrame(frameBytes);
        if (val) result.title = val;
      } else if (frameId === 'TP1') {
        const val = decodeTextFrame(frameBytes);
        if (val) result.artist = val;
      } else if (frameId === 'TAL') {
        const val = decodeTextFrame(frameBytes);
        if (val) result.albumTitle = val;
      } else if (frameId === 'TCO') {
        const val = decodeTextFrame(frameBytes).replace(/^\(\d+\)/, '').trim();
        if (val) result.genre = val;
      } else if (frameId === 'TYE') {
        const yr = parseInt(decodeTextFrame(frameBytes).slice(0, 4), 10);
        if (yr >= 1900 && yr <= 2100) result.year = yr;
      } else if (frameId === 'PIC' && !result.coverData) {
        const art = decodeApicFrame(frameBytes, true);
        if (art) {
          result.coverData = art.data;
          result.coverMime = art.mime;
        }
      }
      offset += frameSize;
    }
    return;
  }

  // ID3v2.3 & ID3v2.4: 4-char frame ID + 4-byte size + 2-byte flags
  while (offset + 10 < limit) {
    const frameId = readAscii(view, offset, 4);
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

    const frameSize =
      majorVersion === 4
        ? readSynchsafeInt(view, offset + 4)
        : view.getUint32(offset + 4, false);

    offset += 10;
    if (frameSize <= 0 || offset + frameSize > limit) break;

    const frameBytes = new Uint8Array(buffer, offset, frameSize);
    if (frameId === 'TIT2') {
      const val = decodeTextFrame(frameBytes);
      if (val) result.title = val;
    } else if (frameId === 'TPE1') {
      const val = decodeTextFrame(frameBytes);
      if (val) result.artist = val;
    } else if (frameId === 'TALB') {
      const val = decodeTextFrame(frameBytes);
      if (val) result.albumTitle = val;
    } else if (frameId === 'TCON') {
      const val = decodeTextFrame(frameBytes).replace(/^\(\d+\)/, '').trim();
      if (val) result.genre = val;
    } else if (frameId === 'TYER' || frameId === 'TDRC') {
      const yr = parseInt(decodeTextFrame(frameBytes).slice(0, 4), 10);
      if (yr >= 1900 && yr <= 2100) result.year = yr;
    } else if (frameId === 'APIC' && !result.coverData) {
      const art = decodeApicFrame(frameBytes, false);
      if (art) {
        result.coverData = art.data;
        result.coverMime = art.mime;
      }
    }

    offset += frameSize;
  }
}

function parseFlac(view: DataView, buffer: ArrayBuffer, result: ParsedBinaryMetadata): void {
  let offset = 4; // skip "fLaC"
  while (offset + 4 <= buffer.byteLength) {
    const header = view.getUint8(offset);
    const isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockLen = readUint24BE(view, offset + 1);
    offset += 4;
    if (offset + blockLen > buffer.byteLength) break;

    if (blockType === 4) {
      // VORBIS_COMMENT (little-endian lengths)
      let p = offset;
      if (p + 4 <= offset + blockLen) {
        const vendorLen = view.getUint32(p, true);
        p += 4 + vendorLen;
        if (p + 4 <= offset + blockLen) {
          const count = view.getUint32(p, true);
          p += 4;
          const decoder = new TextDecoder('utf-8');
          for (let i = 0; i < count && p + 4 <= offset + blockLen; i++) {
            const len = view.getUint32(p, true);
            p += 4;
            if (p + len > offset + blockLen) break;
            const entry = decoder.decode(new Uint8Array(buffer, p, len));
            p += len;
            const eq = entry.indexOf('=');
            if (eq > 0) {
              const key = entry.slice(0, eq).toUpperCase();
              const val = entry.slice(eq + 1).trim();
              if (key === 'TITLE' && val) result.title = val;
              else if (key === 'ARTIST' && val) result.artist = val;
              else if (key === 'ALBUM' && val) result.albumTitle = val;
              else if (key === 'GENRE' && val) result.genre = val;
              else if (key === 'DATE' && val) {
                const yr = parseInt(val.slice(0, 4), 10);
                if (yr >= 1900 && yr <= 2100) result.year = yr;
              }
            }
          }
        }
      }
    } else if (blockType === 6 && !result.coverData) {
      // METADATA_BLOCK_PICTURE (big-endian)
      let p = offset + 4; // skip picture type
      if (p + 4 <= offset + blockLen) {
        const mimeLen = view.getUint32(p, false);
        p += 4;
        const mime = readAscii(view, p, mimeLen);
        p += mimeLen;
        if (p + 4 <= offset + blockLen) {
          const descLen = view.getUint32(p, false);
          p += 4 + descLen + 16; // skip width, height, depth, colors (4*4)
          if (p + 4 <= offset + blockLen) {
            const dataLen = view.getUint32(p, false);
            p += 4;
            if (dataLen > 16 && p + dataLen <= offset + blockLen) {
              const imgData = new Uint8Array(buffer, p, dataLen).slice();
              result.coverData = imgData;
              result.coverMime = detectImageMime(imgData, mime);
            }
          }
        }
      }
    }

    offset += blockLen;
    if (isLast) break;
  }
}

function parseMp4Atoms(
  view: DataView,
  buffer: ArrayBuffer,
  start: number,
  end: number,
  result: ParsedBinaryMetadata
): void {
  let offset = start;
  const decoder = new TextDecoder('utf-8');

  while (offset + 8 <= end) {
    let size = view.getUint32(offset, false);
    const type = readAscii(view, offset + 4, 4);
    if (size === 0) size = end - offset;
    if (size < 8 || offset + size > end) break;

    const payloadStart = offset + 8;
    const payloadEnd = offset + size;

    if (type === 'moov' || type === 'udta' || type === 'ilst') {
      parseMp4Atoms(view, buffer, payloadStart, payloadEnd, result);
    } else if (type === 'meta') {
      // meta box has 4-byte version/flags prefix before child atoms
      parseMp4Atoms(view, buffer, payloadStart + 4, payloadEnd, result);
    } else if (
      type === '\u00a9nam' ||
      type === '\u00a9ART' ||
      type === '\u00a9alb' ||
      type === '\u00a9day' ||
      type === '\u00a9gen' ||
      type === 'covr'
    ) {
      // Find nested "data" atom
      let p = payloadStart;
      while (p + 16 <= payloadEnd) {
        const subSize = view.getUint32(p, false);
        const subType = readAscii(view, p + 4, 4);
        if (subSize < 16 || p + subSize > payloadEnd) break;
        if (subType === 'data') {
          const dataBytes = new Uint8Array(buffer, p + 16, subSize - 16);
          if (type === 'covr' && !result.coverData && dataBytes.length > 16) {
            const copy = dataBytes.slice();
            result.coverData = copy;
            result.coverMime = detectImageMime(copy);
          } else if (type !== 'covr') {
            const text = decoder.decode(dataBytes).replace(/\0/g, '').trim();
            if (text) {
              if (type === '\u00a9nam') result.title = text;
              else if (type === '\u00a9ART') result.artist = text;
              else if (type === '\u00a9alb') result.albumTitle = text;
              else if (type === '\u00a9gen') result.genre = text;
              else if (type === '\u00a9day') {
                const yr = parseInt(text.slice(0, 4), 10);
                if (yr >= 1900 && yr <= 2100) result.year = yr;
              }
            }
          }
          break;
        }
        p += subSize;
      }
    }

    offset += size;
  }
}

/**
 * Pure binary audio tag parser supporting MP3 (ID3v2.2 / v2.3 / v2.4),
 * FLAC (VORBIS_COMMENT & PICTURE), and MP4/M4A (moov/udta/meta/ilst/covr).
 */
export function parseAudioMetadataBuffer(
  buffer: ArrayBuffer,
  fileName: string
): ParsedBinaryMetadata {
  const parsedName = parseLocalFileName(fileName);
  const result: ParsedBinaryMetadata = {
    title: parsedName.title,
    artist: parsedName.artist,
    albumTitle: 'Local Library',
    genre: 'Local Audio',
    year: new Date().getFullYear(),
  };

  if (buffer.byteLength < 12) return result;
  const view = new DataView(buffer);
  const magic = readAscii(view, 0, 4);

  if (magic.startsWith('ID3')) {
    parseId3v2(view, buffer, result);
  } else if (magic === 'fLaC') {
    parseFlac(view, buffer, result);
  } else if (readAscii(view, 4, 4) === 'ftyp') {
    parseMp4Atoms(view, buffer, 0, buffer.byteLength, result);
  }

  return result;
}

/**
 * Extracts real embedded album cover art (ID3/APIC, FLAC PICTURE, MP4 covr)
 * plus title, artist, album, genre, and year from local audio files.
 */
export async function extractAudioMetadataFromFile(
  file: File
): Promise<ExtractedAudioMetadata> {
  const parsedName = parseLocalFileName(file.name);
  const fallback: ExtractedAudioMetadata = {
    title: parsedName.title,
    artist: parsedName.artist,
    albumTitle: 'Local Library',
    genre: 'Local Audio',
    year: new Date().getFullYear(),
    coverUrl: '',
    coverBytes: 0,
  };

  try {
    // Read up to first 4MB to reliably cover high-res embedded album artwork
    const slice = file.slice(0, Math.min(file.size, 4_000_000));
    const buffer = await slice.arrayBuffer();
    const parsed = parseAudioMetadataBuffer(buffer, file.name);

    let coverUrl = '';
    let coverBytes = 0;
    if (parsed.coverData && parsed.coverData.byteLength > 16) {
      const safeBytes = new Uint8Array(parsed.coverData.byteLength);
      safeBytes.set(parsed.coverData);
      const blob = new Blob([safeBytes], {
        type: parsed.coverMime || 'image/jpeg',
      });
      coverUrl = URL.createObjectURL(blob);
      coverBytes = blob.size;
    }

    return {
      title: parsed.title,
      artist: parsed.artist,
      albumTitle: parsed.albumTitle,
      genre: parsed.genre,
      year: parsed.year,
      coverUrl,
      coverBytes,
    };
  } catch {
    return fallback;
  }
}
