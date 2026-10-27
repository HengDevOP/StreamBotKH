import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ObjectId } from 'mongodb';
import { getAuthenticatedUser } from '@/server/auth';
import { getMediaCollection } from '@/server/database/mongo';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const mediaId = params.id;
    if (!mediaId || !ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const mediaCol = await getMediaCollection();
    const media = await mediaCol.findOne({
      _id: new ObjectId(mediaId),
      userId
    });

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
    await mediaCol.deleteOne({ _id: new ObjectId(mediaId), userId });

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully.'
    });
  } catch (err: any) {
    console.error('API /api/media/[id] DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}
