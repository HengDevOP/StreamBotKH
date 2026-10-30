import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection, MediaDoc, restoreMediaFile } from '@/server/database/mongo';
import { db } from '@/server/database/db';

function safeBroadcastMediaUpdate(userId: string, data: { media: any[]; storage: any }) {
  try {
    const io = (global as any).socketIO;
    if (io) {
      console.log(`⚡ [Socket] Broadcasting media:updated for user [${userId}] (${data?.media?.length || 0} items)`);
      io.to(`dashboard:${userId}`).emit('media:updated', data);
      io.emit(`media:${userId}:updated`, data);
      io.emit('media:updated', { ...data, userId });
    }
  } catch (e) {
    console.warn('Socket broadcast update failed:', e);
  }
}

// Media storage limits per user plan (no per-upload limit, only bounded by total remaining plan quota)
export const PLAN_STORAGE_LIMITS: Record<string, { label: string; limitBytes: number }> = {
  free: { label: 'Free (20MB)', limitBytes: 20 * 1024 * 1024 }, // 20MB
  starter: { label: 'Starter (100MB)', limitBytes: 100 * 1024 * 1024 }, // 100MB
  pro: { label: 'Pro (100MB)', limitBytes: 100 * 1024 * 1024 }, // 100MB
  studio: { label: 'Pro (100MB)', limitBytes: 100 * 1024 * 1024 } // backwards compatibility
};

export interface CachedMediaResult {
  media: any[];
  storage: {
    plan: string;
    planLabel: string;
    usedBytes: number;
    limitBytes: number;
    remainingBytes: number;
    percentUsed: number;
  };
  etag: string;
}

interface ServerCacheEntry extends CachedMediaResult {
  timestamp: number;
}

// In-memory cache for media to avoid hammering DB & disk on repeated page reloads (persisted on globalThis across dev hot-reloads)
const g = globalThis as any;
if (!g.__streamneon_mediaCache) g.__streamneon_mediaCache = new Map<string, ServerCacheEntry>();
if (!g.__streamneon_inFlightFetches) g.__streamneon_inFlightFetches = new Map<string, Promise<CachedMediaResult>>();
if (!g.__streamneon_verifiedFilesOnDisk) g.__streamneon_verifiedFilesOnDisk = new Set<string>();

const mediaCache: Map<string, ServerCacheEntry> = g.__streamneon_mediaCache;
const inFlightFetches: Map<string, Promise<CachedMediaResult>> = g.__streamneon_inFlightFetches;
const verifiedFilesOnDisk: Set<string> = g.__streamneon_verifiedFilesOnDisk;

const CACHE_TTL_MS = 45 * 1000; // 45 seconds TTL

export function invalidateMediaCache(userId?: string) {
  if (userId) {
    for (const key of Array.from(mediaCache.keys())) {
      if (key.startsWith(userId) || key.includes(userId)) {
        mediaCache.delete(key);
      }
    }
    for (const key of Array.from(inFlightFetches.keys())) {
      if (key.startsWith(userId) || key.includes(userId)) {
        inFlightFetches.delete(key);
      }
    }
  } else {
    mediaCache.clear();
    inFlightFetches.clear();
  }
}

export function detectMimeType(mimeType: string, ext: string): string {
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

/**
 * Fetch and synchronize media files for a user from MongoDB and disk
 */
export async function fetchUserMediaData(userId: string, email?: string): Promise<CachedMediaResult> {
  const mediaCol = await getMediaCollection();
  const filter = email
    ? { $or: [{ userId }, { userEmail: email }] }
    : { userId };
  const mediaList = await mediaCol.find(filter).sort({ createdAt: -1 }).toArray();

  const validMediaList: MediaDoc[] = [];
  let prunedCount = 0;

  // Ensure all media files for this user exist on disk or are restored from Cloud backup.
  // If a media file cannot be restored and is missing from disk, automatically prune it
  // to keep storage clean and free up storage space.
  for (const item of mediaList) {
    if (item.storedFilename && !verifiedFilesOnDisk.has(item.storedFilename)) {
      const ok = await restoreMediaFile(item);
      if (ok) {
        verifiedFilesOnDisk.add(item.storedFilename);
        validMediaList.push(item);
      } else {
        // Record is broken or points to non-existent file with no backup -> auto-prune from database
        console.warn(`🧹 [Media Storage] Auto-pruning unrecoverable media record: ${item.filename} (ID: ${item._id})`);
        try {
          await mediaCol.deleteOne({ _id: item._id });
          prunedCount++;
        } catch (e) {}
      }
    } else {
      validMediaList.push(item);
    }
  }

  if (prunedCount > 0) {
    console.log(`🧹 [Media Storage] Auto-pruned ${prunedCount} ghost/unrecoverable media items to free storage space.`);
  }

  // Get user plan
  const streamerRow = db.prepare('SELECT plan FROM streamers WHERE id = ? OR LOWER(email) = LOWER(?)').get(userId, email || '') as any;
  const userPlan = (streamerRow?.plan || 'free').toLowerCase();
  const quota = PLAN_STORAGE_LIMITS[userPlan] || PLAN_STORAGE_LIMITS.free;

  const usedBytes = validMediaList.reduce((acc, item) => acc + (item.fileSize || 0), 0);
  const storage = {
    plan: userPlan,
    planLabel: quota.label,
    usedBytes,
    limitBytes: quota.limitBytes,
    remainingBytes: Math.max(0, quota.limitBytes - usedBytes),
    percentUsed: Math.min(100, parseFloat(((usedBytes / quota.limitBytes) * 100).toFixed(1)))
  };

  const latestTime = validMediaList[0]?.createdAt ? new Date(validMediaList[0].createdAt).getTime() : 0;
  const etag = `W/"media-${userId}-${validMediaList.length}-${usedBytes}-${latestTime}"`;

  return { media: validMediaList, storage, etag };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';
    const email = authUser?.email || '';
    const cacheKey = `${userId}:${email}`;

    const ifNoneMatch = req.headers.get('if-none-match');
    const now = Date.now();

    // 1. Check in-memory server cache
    const cached = mediaCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
            'X-Cache': 'HIT-304'
          }
        });
      }

      return NextResponse.json(
        {
          success: true,
          media: cached.media,
          storage: cached.storage
        },
        {
          headers: {
            ETag: cached.etag,
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
            'X-Cache': 'HIT'
          }
        }
      );
    }

    // 2. In-flight request deduplication (prevents server overload when multiple components mount concurrently)
    let fetchPromise = inFlightFetches.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = fetchUserMediaData(userId, email)
        .then((result) => {
          mediaCache.set(cacheKey, {
            ...result,
            timestamp: Date.now()
          });
          return result;
        })
        .finally(() => {
          inFlightFetches.delete(cacheKey);
        });

      inFlightFetches.set(cacheKey, fetchPromise);
    }

    const result = await fetchPromise;

    if (ifNoneMatch && ifNoneMatch === result.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.etag,
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'X-Cache': 'MISS-304'
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        media: result.media,
        storage: result.storage
      },
      {
        headers: {
          ETag: result.etag,
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'X-Cache': 'MISS'
        }
      }
    );
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
    const email = authUser?.email || '';
    const cacheKey = `${userId}:${email}`;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please choose a file to upload.' },
        { status: 400 }
      );
    }

    // 1. Check User's Total Plan Storage Quota (No per-file size limit; only total remaining plan storage)
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
      const fileMb = (file.size / (1024 * 1024)).toFixed(1);
      const totalAttemptedMb = ((usedBytes + file.size) / (1024 * 1024)).toFixed(1);
      const limitMb = (quota.limitBytes / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        {
          error: `Storage Limit Exceeded: ${totalAttemptedMb} MB attempted (${usedMb} MB used + ${fileMb} MB file) exceeds max ${limitMb} MB limit. Delete existing media or upgrade plan.`,
          storageLimitExceeded: true,
          usedBytes,
          attemptedBytes: file.size,
          totalAttemptedBytes: usedBytes + file.size,
          limitBytes: quota.limitBytes
        },
        { status: 400 }
      );
    }

    // 2. Prepare target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
    await fs.mkdir(uploadDir, { recursive: true });

    // 3. Generate unique stored filename preserving original extension
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

    // 4. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    verifiedFilesOnDisk.add(storedFilename);

    const publicUrl = `/uploads/media/${storedFilename}`;
    const detectedMime = detectMimeType(mimeType, safeExt);
    const base64Data = buffer.toString('base64');

    // 5. Save media document to MongoDB with persistent Cloud backup
    const mediaDoc: MediaDoc = {
      userId,
      userEmail: authUser?.email || '',
      filename: originalName,
      storedFilename,
      url: publicUrl,
      fileType: detectedMime,
      fileSize: file.size,
      fileBase64: file.size <= 15 * 1024 * 1024 ? base64Data : undefined,
      createdAt: new Date()
    };

    const insertResult = await mediaCol.insertOne(mediaDoc);

    // 6. Invalidate server cache and compute fresh list
    invalidateMediaCache(userId);
    const freshData = await fetchUserMediaData(userId, email);
    mediaCache.set(cacheKey, {
      ...freshData,
      timestamp: Date.now()
    });

    // 7. Broadcast real-time WebSocket update to all open dashboards and overlays
    safeBroadcastMediaUpdate(userId, {
      media: freshData.media,
      storage: freshData.storage
    });

    return NextResponse.json({
      success: true,
      message: 'Media uploaded successfully!',
      media: {
        ...mediaDoc,
        _id: insertResult.insertedId
      },
      storage: freshData.storage
    });
  } catch (err: any) {
    console.error('API /api/media POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload media' },
      { status: 500 }
    );
  }
}
