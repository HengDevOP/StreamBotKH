import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ObjectId } from 'mongodb';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection } from '@/server/database/mongo';
import { invalidateMediaCache, fetchUserMediaData } from '../route';

function safeBroadcastMediaDelete(userId: string, mediaId: string) {
  try {
    const io = (global as any).socketIO;
    if (io) {
      console.log(`⚡ [Socket] Broadcasting media:deleted for user [${userId}] (mediaId: ${mediaId})`);
      io.to(`dashboard:${userId}`).emit('media:deleted', { mediaId, userId });
      io.emit(`media:${userId}:deleted`, { mediaId });
      io.emit('media:deleted', { mediaId, userId });
    }
  } catch (e) {
    console.warn('Socket broadcast delete failed:', e);
  }
}

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';
    const email = authUser?.email || '';

    const mediaId = params.id;
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const mediaCol = await getMediaCollection();

    // Query by ObjectId if valid, or string id
    let filter: any;
    if (ObjectId.isValid(mediaId)) {
      filter = authUser?.email
        ? { _id: new ObjectId(mediaId), $or: [{ userId }, { userEmail: authUser.email }] }
        : { _id: new ObjectId(mediaId), userId };
    } else {
      filter = authUser?.email
        ? { $and: [{ $or: [{ _id: mediaId as any }, { id: mediaId as any }] }, { $or: [{ userId }, { userEmail: authUser.email }] }] }
        : { $and: [{ $or: [{ _id: mediaId as any }, { id: mediaId as any }] }, { userId }] };
    }

    let media = await mediaCol.findOne(filter);

    // Broad fallback check: if not matched with userId, check if _id exists in collection
    if (!media && ObjectId.isValid(mediaId)) {
      const globalMatch = await mediaCol.findOne({ _id: new ObjectId(mediaId) });
      if (globalMatch) {
        media = globalMatch;
      }
    }

    // If media is not found in MongoDB (already deleted, ghost item, or stale cache)
    if (!media) {
      console.log(`🧹 [Media API] Media ID [${mediaId}] not found in database. Auto-pruning to reclaim storage space.`);

      // 1. Invalidate server cache
      invalidateMediaCache(userId);

      // 2. Scan and remove any leftover physical files on disk matching this ID
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
        const exists = await fs.stat(uploadDir).then(() => true).catch(() => false);
        if (exists) {
          const files = await fs.readdir(uploadDir);
          for (const file of files) {
            if (file.includes(mediaId)) {
              await fs.unlink(path.join(uploadDir, file)).catch(() => {});
            }
          }
        }
      } catch (e) {}

      // 3. Fetch fresh user media data & recalculated storage
      const freshData = await fetchUserMediaData(userId, email);

      // 4. Broadcast deletion and update over WebSocket so all clients prune the ghost card
      safeBroadcastMediaDelete(userId, mediaId);
      safeBroadcastMediaUpdate(userId, {
        media: freshData.media,
        storage: freshData.storage
      });

      return NextResponse.json({
        success: true,
        pruned: true,
        message: 'Media asset was not found in database and has been automatically pruned from library.',
        storage: freshData.storage
      });
    }

    // 1. Delete physical file from disk if present
    if (media.storedFilename) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'media', media.storedFilename);
        await fs.unlink(filePath);
      } catch (e) {
        // Safe to continue if file already gone
      }
    }

    // 2. Delete document from MongoDB
    await mediaCol.deleteOne({ _id: media._id });

    // 3. Invalidate server cache
    invalidateMediaCache(userId);

    // 4. Fetch updated media collection and broadcast real-time sync via WebSocket
    const freshData = await fetchUserMediaData(userId, email);

    safeBroadcastMediaDelete(userId, mediaId);
    safeBroadcastMediaUpdate(userId, {
      media: freshData.media,
      storage: freshData.storage
    });

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully.',
      storage: freshData.storage
    });
  } catch (err: any) {
    console.error('API /api/media/[id] DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}
