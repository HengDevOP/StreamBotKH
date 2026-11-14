import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getSupportTicketsCollection } from '@/server/database/mongo';
import { getTicketCaller } from '@/server/services/ticketAuth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per attachment
const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes max per uploaded video

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.heic', '.heif', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.ogv', '.3gp', '.avi', '.mkv']);
const VOICE_AUDIO_EXTENSIONS = new Set(['.webm', '.ogg', '.mp3', '.wav', '.m4a', '.aac', '.opus']);

/**
 * Best-effort pure-Node parser for MP4/MOV (mvhd) and WebM/MKV (EBML Info) video duration in seconds.
 * Returns null if container metadata is absent or unrecognized.
 */
function extractVideoDurationSec(buffer: Buffer, ext: string, mimeType: string): number | null {
  try {
    // 1. ISO BMFF (MP4 / MOV / M4V / 3GP): walk boxes for moov -> mvhd
    if (ext === '.mp4' || ext === '.mov' || ext === '.m4v' || ext === '.3gp' || mimeType.includes('mp4') || mimeType.includes('quicktime')) {
      const findBox = (start: number, end: number, target: string): { dataStart: number; boxEnd: number } | null => {
        let offset = start;
        while (offset + 8 <= end) {
          let size = buffer.readUInt32BE(offset);
          const type = buffer.toString('ascii', offset + 4, offset + 8);
          let headerSize = 8;
          if (size === 1 && offset + 16 <= end) {
            const bigSize = Number(buffer.readBigUInt64BE(offset + 8));
            size = bigSize;
            headerSize = 16;
          } else if (size === 0) {
            size = end - offset;
          }
          if (size < headerSize || offset + size > end) break;
          if (type === target) {
            return { dataStart: offset + headerSize, boxEnd: offset + size };
          }
          offset += size;
        }
        return null;
      };

      const moov = findBox(0, buffer.length, 'moov');
      if (moov) {
        const mvhd = findBox(moov.dataStart, moov.boxEnd, 'mvhd');
        if (mvhd && mvhd.dataStart + 20 <= mvhd.boxEnd) {
          const version = buffer.readUInt8(mvhd.dataStart);
          if (version === 0 && mvhd.dataStart + 20 <= mvhd.boxEnd) {
            const timescale = buffer.readUInt32BE(mvhd.dataStart + 12);
            const duration = buffer.readUInt32BE(mvhd.dataStart + 16);
            if (timescale > 0 && duration > 0) {
              return Math.round(duration / timescale);
            }
          } else if (version === 1 && mvhd.dataStart + 32 <= mvhd.boxEnd) {
            const timescale = buffer.readUInt32BE(mvhd.dataStart + 20);
            const duration = Number(buffer.readBigUInt64BE(mvhd.dataStart + 24));
            if (timescale > 0 && duration > 0) {
              return Math.round(duration / timescale);
            }
          }
        }
      }
    }

    // 2. WebM / MKV (EBML): read TimecodeScale (0x2AD7B1) & Duration (0x4489) inside Info (0x1549A966)
    if (ext === '.webm' || ext === '.mkv' || mimeType.includes('webm') || mimeType.includes('matroska')) {
      const readVintLength = (pos: number): { val: number; len: number } | null => {
        if (pos >= buffer.length) return null;
        const first = buffer[pos];
        if (first === 0) return null;
        let len = 1;
        let mask = 0x80;
        while (len <= 8 && (first & mask) === 0) {
          mask >>= 1;
          len++;
        }
        if (len > 8 || pos + len > buffer.length) return null;
        let val = first & (mask - 1);
        for (let i = 1; i < len; i++) {
          val = val * 256 + buffer[pos + i];
        }
        return { val, len };
      };

      const scanLimit = Math.min(buffer.length, 512 * 1024);
      const infoMarker = Buffer.from([0x15, 0x49, 0xa9, 0x66]);
      const infoIdx = buffer.indexOf(infoMarker, 0);
      if (infoIdx !== -1 && infoIdx < scanLimit) {
        const sizeInfo = readVintLength(infoIdx + 4);
        if (sizeInfo) {
          let cursor = infoIdx + 4 + sizeInfo.len;
          const infoEnd = Math.min(buffer.length, cursor + sizeInfo.val);
          let timecodeScale = 1_000_000;
          let rawDuration: number | null = null;

          while (cursor + 2 < infoEnd) {
            if (buffer[cursor] === 0x2a && buffer[cursor + 1] === 0xd7 && buffer[cursor + 2] === 0xb1) {
              const s = readVintLength(cursor + 3);
              if (!s) break;
              const dStart = cursor + 3 + s.len;
              if (dStart + s.val <= infoEnd && s.val <= 8) {
                let scale = 0;
                for (let i = 0; i < s.val; i++) scale = scale * 256 + buffer[dStart + i];
                if (scale > 0) timecodeScale = scale;
              }
              cursor = dStart + s.val;
            } else if (buffer[cursor] === 0x44 && buffer[cursor + 1] === 0x89) {
              const s = readVintLength(cursor + 2);
              if (!s) break;
              const dStart = cursor + 2 + s.len;
              if (dStart + s.val <= infoEnd) {
                if (s.val === 4) rawDuration = buffer.readFloatBE(dStart);
                else if (s.val === 8) rawDuration = buffer.readDoubleBE(dStart);
              }
              cursor = dStart + s.val;
            } else {
              cursor++;
            }
          }

          if (rawDuration !== null && Number.isFinite(rawDuration) && rawDuration > 0) {
            return Math.round((rawDuration * timecodeScale) / 1_000_000_000);
          }
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

const DEFAULT_MIME_EXTENSION: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-m4v': '.m4v',
  'video/ogg': '.ogv'
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getTicketCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;
    const ticketsCol = await getSupportTicketsCollection();
    const ticketRow = (await ticketsCol.findOne({ id: ticketId })) as any;
    if (!ticketRow) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const ticketStreamerId = ticketRow.streamerId || ticketRow.streamer_id;
    if (!caller.isAdmin && ticketStreamerId !== caller.id) {
      return NextResponse.json(
        { error: 'Access denied: not authorized to upload to this ticket' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File exceeds 20 MB limit (${sizeMb} MB). Please choose a smaller file.` },
        { status: 400 }
      );
    }

    const mimeType = String(file.type || '').split(';')[0].trim().toLowerCase();
    const requestedKind = String(formData.get('kind') || '').trim().toLowerCase();
    const rawDuration = Number(formData.get('durationSec'));
    const durationSec = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : undefined;

    const originalName = path.basename(file.name || 'attachment');
    let ext = path.extname(originalName).toLowerCase();
    if (!ext && DEFAULT_MIME_EXTENSION[mimeType]) {
      ext = DEFAULT_MIME_EXTENSION[mimeType];
    }

    const isImage = IMAGE_EXTENSIONS.has(ext) || (mimeType.startsWith('image/') && !mimeType.includes('svg'));
    const isVoice = requestedKind === 'voice' && (VOICE_AUDIO_EXTENSIONS.has(ext) || mimeType.startsWith('audio/'));
    const isVideo = !isVoice && (mimeType.startsWith('video/') || (VIDEO_EXTENSIONS.has(ext) && !mimeType.startsWith('audio/')));

    if (!isImage && !isVideo && !isVoice) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${ext || mimeType || 'unknown'}). Only images and videos are allowed.`
        },
        { status: 400 }
      );
    }

    // Determine normalized attachment kind
    let kind: 'voice' | 'image' | 'video' = 'image';
    if (isVoice) {
      kind = 'voice';
    } else if (isVideo) {
      kind = 'video';
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let finalDurationSec = durationSec;

    if (kind === 'video') {
      const containerDurationSec = extractVideoDurationSec(buffer, ext, mimeType);
      const effectiveDurationSec = containerDurationSec ?? durationSec;
      if (effectiveDurationSec !== undefined && effectiveDurationSec > MAX_VIDEO_DURATION_SEC) {
        return NextResponse.json(
          {
            error: `Video duration cannot exceed 5 minutes (${MAX_VIDEO_DURATION_SEC} seconds).`
          },
          { status: 400 }
        );
      }
      if (!finalDurationSec && containerDurationSec) {
        finalDurationSec = containerDurationSec;
      }
    }

    const safeTicketDir = ticketId.replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets', safeTicketDir);
    await fs.mkdir(uploadDir, { recursive: true });

    const safeStem =
      path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32) || (kind === 'voice' ? 'voice' : kind === 'video' ? 'video' : 'image');

    const storedFilename = `${Date.now()}-${safeStem}-${uuidv4().slice(0, 8)}${ext}`;
    const targetPath = path.join(uploadDir, storedFilename);

    await fs.writeFile(targetPath, buffer);

    const publicUrl = `/uploads/tickets/${safeTicketDir}/${storedFilename}`;

    return NextResponse.json({
      success: true,
      attachment: {
        id: 'att_' + uuidv4().replace(/-/g, '').slice(0, 12),
        kind,
        name: originalName,
        url: publicUrl,
        mimeType: mimeType || undefined,
        size: file.size,
        ...(finalDurationSec ? { durationSec: finalDurationSec } : {})
      }
    });
  } catch (err: any) {
    console.error('[Ticket Upload POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload attachment' }, { status: 500 });
  }
}
