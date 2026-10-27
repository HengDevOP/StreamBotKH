import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection, MediaDoc } from '@/server/database/mongo';
import { db } from '@/server/database/db';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per individual file
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a',
  'audio/mp4'
];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.webm', '.m4a'];

// Media storage limits per user plan
const PLAN_STORAGE_LIMITS: Record<string, { label: string; limitBytes: number }> = {
  free: { label: 'Free (20MB)', limitBytes: 20 * 1024 * 1024 }, // 20MB
  starter: { label: 'Starter (1GB)', limitBytes: 1 * 1024 * 1024 * 1024 }, // 1GB
  pro: { label: 'Pro (10GB)', limitBytes: 10 * 1024 * 1024 * 1024 }, // 10GB
  studio: { label: 'Pro (10GB)', limitBytes: 10 * 1024 * 1024 * 1024 } // backwards compatibility
};

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const mediaCol = await getMediaCollection();
    const mediaList = await mediaCol.find({ userId }).sort({ createdAt: -1 }).toArray();

    // Get user plan
    const streamerRow = db.prepare('SELECT plan FROM streamers WHERE id = ?').get(userId) as any;
    const userPlan = (streamerRow?.plan || 'free').toLowerCase();
    const quota = PLAN_STORAGE_LIMITS[userPlan] || PLAN_STORAGE_LIMITS.free;

    const usedBytes = mediaList.reduce((acc, item) => acc + (item.fileSize || 0), 0);

    return NextResponse.json({
      success: true,
      media: mediaList,
      storage: {
        plan: userPlan,
        planLabel: quota.label,
        usedBytes,
        limitBytes: quota.limitBytes,
        remainingBytes: Math.max(0, quota.limitBytes - usedBytes),
        percentUsed: Math.min(100, parseFloat(((usedBytes / quota.limitBytes) * 100).toFixed(1)))
      }
    });
  } catch (err: any) {
    console.error('API /api/media GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch media library' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please choose a PNG, JPG, or GIF file.' },
        { status: 400 }
      );
    }

    // 1. Validate individual file size (2MB max per file)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File size exceeds the 2MB limit per file (your file is ${sizeMb} MB). Please choose a smaller file.` },
        { status: 400 }
      );
    }

    // 2. Validate MIME type & extension
    const mimeType = (file.type || '').toLowerCase();
    const originalName = file.name || 'uploaded-media';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported format. Allowed: PNG, JPG, GIF, WEBP, MP3, WAV, OGG.' },
        { status: 400 }
      );
    }

    // 3. Check User's Plan Storage Quota in MongoDB
    const mediaCol = await getMediaCollection();
    const existingMedia = await mediaCol.find({ userId }).toArray();
    const usedBytes = existingMedia.reduce((acc, item) => acc + (item.fileSize || 0), 0);

    const streamerRow = db.prepare('SELECT plan FROM streamers WHERE id = ?').get(userId) as any;
    const userPlan = (streamerRow?.plan || 'free').toLowerCase();
    const quota = PLAN_STORAGE_LIMITS[userPlan] || PLAN_STORAGE_LIMITS.free;

    if (usedBytes + file.size > quota.limitBytes) {
      const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
      const limitDisplay = userPlan === 'free' ? '20MB' : userPlan === 'starter' ? '1GB' : '10GB';
      return NextResponse.json(
        {
          error: `Storage quota exceeded for your ${userPlan.toUpperCase()} plan (${usedMb}MB used of ${limitDisplay} limit). Please upgrade to Starter ($1.99/mo for 1GB) or Pro ($4.99/mo for 10GB), or delete older media.`
        },
        { status: 400 }
      );
    }

    // 4. Prepare target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
    await fs.mkdir(uploadDir, { recursive: true });

    // 5. Generate unique stored filename
    const safeExt = ext || (mimeType.includes('gif') ? '.gif' : mimeType.includes('mp3') ? '.mp3' : mimeType.includes('wav') ? '.wav' : mimeType.includes('png') ? '.png' : '.jpg');
    const storedFilename = `${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, storedFilename);

    // 6. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/media/${storedFilename}`;

    const isGenericMime = !mimeType || mimeType === 'application/octet-stream';
    const detectedMime = !isGenericMime
      ? mimeType
      : ['.mp3', '.wav', '.ogg', '.webm', '.m4a'].includes(safeExt)
      ? (safeExt === '.wav' ? 'audio/wav' : safeExt === '.ogg' ? 'audio/ogg' : 'audio/mpeg')
      : (safeExt === '.gif' ? 'image/gif' : safeExt === '.png' ? 'image/png' : 'image/jpeg');

    // 7. Save media document to MongoDB
    const mediaDoc: MediaDoc = {
      userId,
      filename: originalName,
      storedFilename,
      url: publicUrl,
      fileType: detectedMime,
      fileSize: file.size,
      createdAt: new Date()
    };

    const insertResult = await mediaCol.insertOne(mediaDoc);

    return NextResponse.json({
      success: true,
      message: 'Media uploaded successfully!',
      media: {
        ...mediaDoc,
        _id: insertResult.insertedId
      },
      storage: {
        plan: userPlan,
        usedBytes: usedBytes + file.size,
        limitBytes: quota.limitBytes,
        remainingBytes: Math.max(0, quota.limitBytes - (usedBytes + file.size))
      }
    });
  } catch (err: any) {
    console.error('API /api/media POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload media' },
      { status: 500 }
    );
  }
}
