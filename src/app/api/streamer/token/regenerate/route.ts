import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import {
  getUsersCollection,
  getOverlayTokenHistoryCollection,
  getStreamGoalsCollection,
  getStreamTimersCollection,
  getStreamLeaderboardsCollection,
  getSoundboardsCollection,
  getSoundboardItemsCollection,
  getPokemonSettingsCollection
} from '@/server/database/mongo';

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

    // Update user's overlay token in MongoDB
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

    // Migrate all widget collections in MongoDB from old token → new token
    if (oldToken) {
      try {
        const goalsCol = await getStreamGoalsCollection();
        await goalsCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );

        const timersCol = await getStreamTimersCollection();
        await timersCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );

        const lbCol = await getStreamLeaderboardsCollection();
        await lbCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );

        const sbCol = await getSoundboardsCollection();
        await sbCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );

        const sbiCol = await getSoundboardItemsCollection();
        await sbiCol.updateMany(
          { streamerToken: oldToken },
          { $set: { streamerToken: newToken, updatedAt: new Date() } }
        );

        const pokeCol = await getPokemonSettingsCollection();
        await pokeCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );

        console.log(`🔄 [Token Regenerate] Migrated MongoDB widget data from ${oldToken.slice(0, 10)}... → ${newToken.slice(0, 10)}...`);
      } catch (e) {
        console.warn('[Token Regenerate] Widget migration warning:', e);
      }
    }

    return NextResponse.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
