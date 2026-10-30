import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getOverlayTokenHistoryCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersCol = await getUsersCollection();
    const currentStreamer = await usersCol.findOne({
      $or: [{ userId: user.id }, { id: user.id as any }]
    });

    const oldToken = currentStreamer?.overlayToken || currentStreamer?.overlay_token;
    const newToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);

    // Save old and new tokens to history collection in MongoDB
    try {
      const histCol = await getOverlayTokenHistoryCollection();
      const now = new Date();
      if (oldToken) {
        await histCol.updateOne(
          { token: oldToken },
          { $setOnInsert: { token: oldToken, streamerId: user.id, createdAt: now } },
          { upsert: true }
        );
      }
      await histCol.updateOne(
        { token: newToken },
        { $setOnInsert: { token: newToken, streamerId: user.id, createdAt: now } },
        { upsert: true }
      );
    } catch (e) {}

    await usersCol.updateOne(
      { $or: [{ userId: user.id }, { id: user.id as any }] },
      {
        $set: {
          overlayToken: newToken,
          overlay_token: newToken,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
