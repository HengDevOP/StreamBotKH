import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB for audio clips
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac'
];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.webm', '.aac'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File exceeds 15MB limit (${sizeMb} MB). Please choose a smaller audio file.` },
        { status: 400 }
      );
    }

    const mimeType = (file.type || '').toLowerCase();
    const originalName = file.name || 'custom-sound.mp3';
    const ext = path.extname(originalName).toLowerCase() || '.mp3';

    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid audio format (${mimeType || ext}). Supported: MP3, WAV, OGG, M4A, WEBM.` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'soundboard');
    await fs.mkdir(uploadDir, { recursive: true });

    const safeStem = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `${Date.now()}-${safeStem}-${uuidv4().slice(0, 8)}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    const publicUrl = `/uploads/soundboard/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      originalName,
      fileSize: file.size
    });
  } catch (err: any) {
    console.error('API /api/soundboard/upload POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload audio clip' },
      { status: 500 }
    );
  }
}
