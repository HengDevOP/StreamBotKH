import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection, MediaDoc } from '@/server/database/mongo';
import { db } from '@/server/database/db';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // Up to 100MB per individual file (bounded by plan quota)

// Media storage limits per user plan
const PLAN_STORAGE_LIMITS: Record<string, { label: string; limitBytes: number }> = {
  free: { label: 'Free (20MB)', limitBytes: 20 * 1024 * 1024 }, // 20MB
  starter: { label: 'Starter (100MB)', limitBytes: 100 * 1024 * 1024 }, // 100MB
  pro: { label: 'Pro (100MB)', limitBytes: 100 * 1024 * 1024 }, // 100MB
  studio: { label: 'Pro (100MB)', limitBytes: 100 * 1024 * 1024 } // backwards compatibility
};

function detectMimeType(mimeType: string, ext: string): string {
  const cleanMime = (mimeType || '').toLowerCase().trim();
  if (cleanMime && cleanMime !== 'application/octet-stream') {
    return cleanMime;
  }

  const lowerExt = ext.toLowerCase();
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.wave': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac'
  };

  return mimeMap[lowerExt] || 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const mediaCol = await getMediaCollection();
    const filter = authUser?.email
      ? { $or: [{ userId }, { userEmail: authUser.email }] }
      : { userId };
    const mediaList = await mediaCol.find(filter).sort({ createdAt: -1 }).toArray();

    // Get user plan
    const streamerRow = db.prepare('SELECT plan FROM streamers WHERE id = ? OR LOWER(email) = LOWER(?)').get(userId, authUser?.email || '') as any;
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
        { error: 'No file provided. Please choose a file to upload.' },
        { status: 400 }
      );
    }

    // 1. Validate individual file size (up to 100MB per file)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size (${sizeMb} MB) exceeds the 100MB per-file upload limit.`
        },
        { status: 400 }
      );
    }

    // 2. Check User's Plan Storage Quota in MongoDB
    const mediaCol = await getMediaCollection();
    const quotaFilter = authUser?.email
      ? { $or: [{ userId }, { userEmail: authUser.email }] }
      : { userId };
    const existingMedia = await mediaCol.find(quotaFilter).toArray();
    const usedBytes = existingMedia.reduce((acc, item) => acc + (item.fileSize || 0), 0);

    const streamerRow = db.prepare('SELECT plan FROM streamers WHERE id = ? OR LOWER(email) = LOWER(?)').get(userId, authUser?.email || '') as any;
    const userPlan = (streamerRow?.plan || 'free').toLowerCase();
    const quota = PLAN_STORAGE_LIMITS[userPlan] || PLAN_STORAGE_LIMITS.free;

    if (usedBytes + file.size > quota.limitBytes) {
      const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
      const limitDisplay = userPlan === 'free' ? '20MB' : '100MB';
      return NextResponse.json(
        {
          error: `Storage quota exceeded for your ${userPlan.toUpperCase()} plan (${usedMb}MB used of ${limitDisplay} limit). Upgrade to Pro ($4.99/mo for 100MB) or delete older files.`
        },
        { status: 400 }
      );
    }

    // 3. Prepare target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
    await fs.mkdir(uploadDir, { recursive: true });

    // 4. Generate unique stored filename preserving original extension
    const originalName = file.name || 'uploaded-media';
    const rawExt = path.extname(originalName).toLowerCase();
    const mimeType = (file.type || '').toLowerCase();
    const safeExt =
      rawExt ||
      (mimeType.includes('mp4')
        ? '.mp4'
        : mimeType.includes('webm')
        ? '.webm'
        : mimeType.includes('gif')
        ? '.gif'
        : mimeType.includes('mp3') || mimeType.includes('mpeg')
        ? '.mp3'
        : mimeType.includes('wav')
        ? '.wav'
        : mimeType.includes('png')
        ? '.png'
        : '.bin');

    const storedFilename = `${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, storedFilename);

    // 5. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/media/${storedFilename}`;
    const detectedMime = detectMimeType(mimeType, safeExt);

    // 6. Save media document to MongoDB
    const mediaDoc: MediaDoc = {
      userId,
      userEmail: authUser?.email || '',
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
        planLabel: quota.label,
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
