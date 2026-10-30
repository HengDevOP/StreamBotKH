import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ObjectId } from 'mongodb';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection } from '@/server/database/mongo';
import { invalidateMediaCache, fetchUserMediaData } from '../route';
import { broadcastMediaDelete, broadcastMediaUpdate } from '@/server/services/socketService';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';
    const email = authUser?.email || '';

    const mediaId = params.id;
    if (!mediaId || !ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const mediaCol = await getMediaCollection();
    const filter = authUser?.email
      ? { _id: new ObjectId(mediaId), $or: [{ userId }, { userEmail: authUser.email }] }
      : { _id: new ObjectId(mediaId), userId };
    const media = await mediaCol.findOne(filter);

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found or you do not have permission to delete it.' },
        { status: 404 }
      );
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
    await mediaCol.deleteOne({ _id: new ObjectId(mediaId) });

    // 3. Invalidate server cache
    invalidateMediaCache(userId);

    // 4. Fetch updated media collection and broadcast real-time sync via WebSocket
    const freshData = await fetchUserMediaData(userId, email);

    broadcastMediaDelete(userId, mediaId);
    broadcastMediaUpdate(userId, {
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
