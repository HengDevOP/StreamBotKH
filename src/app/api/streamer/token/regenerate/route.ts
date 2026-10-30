import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getOverlayTokenHistoryCollection, getStreamGoalsCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';

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

    // Migrate all in-memory SQLite tables from old token → new token so goal/timer/widget data is preserved
    if (oldToken) {
      const tablesToMigrate = [
        'stream_goals',
        'stream_timers',
        'stream_leaderboards',
        'stream_soundboards',
        'stream_soundboard_items',
        'pokemon_widget_settings'
      ];

      for (const table of tablesToMigrate) {
        try {
          db.prepare(`UPDATE ${table} SET streamer_token = ? WHERE streamer_token = ?`).run(newToken, oldToken);
        } catch (e) {}
      }

      console.log(`🔄 [Token Regenerate] Migrated SQLite widget data from ${oldToken.slice(0, 10)}... → ${newToken.slice(0, 10)}...`);
    }

    // Also migrate MongoDB stream_goals that reference the old token or this streamer
    try {
      const goalsCol = await getStreamGoalsCollection();
      if (oldToken) {
        await goalsCol.updateMany(
          { $or: [{ streamerToken: oldToken }, { streamerId: user.id }] },
          { $set: { streamerToken: newToken, streamerId: user.id, updatedAt: new Date() } }
        );
      } else {
        await goalsCol.updateMany(
          { streamerId: user.id },
          { $set: { streamerToken: newToken, updatedAt: new Date() } }
        );
      }
    } catch (e) {}

    return NextResponse.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
