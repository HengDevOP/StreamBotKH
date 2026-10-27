import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAuthenticatedUser } from '@/server/auth';
import { getOverlaysCollection } from '@/server/database/mongo';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const overlayId = params.id;
    if (!overlayId || !ObjectId.isValid(overlayId)) {
      return NextResponse.json(
        { error: 'Invalid overlay ID' },
        { status: 400 }
      );
    }

    const overlaysCol = await getOverlaysCollection();
    let overlay = await overlaysCol.findOne({
      _id: new ObjectId(overlayId),
      userId
    });

    if (!overlay) {
      overlay = await overlaysCol.findOne({
        _id: new ObjectId(overlayId)
      });
    }

    if (!overlay) {
      return NextResponse.json(
        { error: 'Overlay not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      overlay
    });
  } catch (err: any) {
    console.error('API /api/overlays/[id] GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch overlay' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const overlayId = params.id;
    if (!overlayId || !ObjectId.isValid(overlayId)) {
      return NextResponse.json(
        { error: 'Invalid overlay ID' },
        { status: 400 }
      );
    }

    const overlaysCol = await getOverlaysCollection();
    const result = await overlaysCol.deleteOne({
      _id: new ObjectId(overlayId),
      userId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Overlay not found or permission denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Overlay deleted successfully'
    });
  } catch (err: any) {
    console.error('API /api/overlays/[id] DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete overlay' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const overlayId = params.id;
    if (!overlayId || !ObjectId.isValid(overlayId)) {
      return NextResponse.json(
        { error: 'Invalid overlay ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updateFields: any = {
      updatedAt: new Date()
    };

    if (body.name) updateFields.name = body.name.trim();
    if (body.mediaUrl) updateFields.mediaUrl = body.mediaUrl;
    if (body.mediaId) updateFields.mediaId = body.mediaId;
    if (body.soundUrl) updateFields.soundUrl = body.soundUrl;
    if (body.soundVolume !== undefined) updateFields.soundVolume = Number(body.soundVolume);
    if (body.glowColor) updateFields.glowColor = body.glowColor;
    if (body.templateStyle) updateFields.templateStyle = body.templateStyle;
    if (body.durationSeconds !== undefined) updateFields.durationSeconds = Number(body.durationSeconds);
    if (body.minAmountAlert !== undefined) updateFields.minAmountAlert = Number(body.minAmountAlert);
    if (body.ttsEnabled !== undefined) updateFields.ttsEnabled = Boolean(body.ttsEnabled);
    if (body.width !== undefined) updateFields.width = Math.max(100, Number(body.width) || 1080);
    if (body.height !== undefined) updateFields.height = Math.max(100, Number(body.height) || 720);

    const overlaysCol = await getOverlaysCollection();
    const result = await overlaysCol.findOneAndUpdate(
      { _id: new ObjectId(overlayId), userId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Overlay not found or permission denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Overlay updated successfully',
      overlay: result
    });
  } catch (err: any) {
    console.error('API /api/overlays/[id] PATCH error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update overlay' },
      { status: 500 }
    );
  }
}
