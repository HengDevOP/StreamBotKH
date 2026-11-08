import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriberSettingsCollection,
  getUsersCollection,
  addMongoMonitoredGroup,
  SubscriberSettingsDoc,
  SubscriberTierDoc
} from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { getIO } from '@/server/services/socketService';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';
import { DEFAULT_SUBSCRIBER_TIERS } from '@/types/subscriber';

export const dynamic = 'force-dynamic';
export { DEFAULT_SUBSCRIBER_TIERS };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const authUser = getAuthenticatedUser(req);

    const usersCol = await getUsersCollection();
    let userDoc: any = null;

    if (authUser?.id) {
      userDoc = await usersCol.findOne({
        $or: [{ userId: authUser.id }, { id: authUser.id as any }]
      });
    }

    if (!userDoc && token && token !== 'demo-token') {
      userDoc = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token }]
      });
    }

    if (!userDoc && username && username !== 'streamer') {
      userDoc = await usersCol.findOne({ username });
    }

    const effectiveToken = userDoc?.overlayToken || token || '';
    const effectiveUsername = userDoc?.username || username || '';

    if (!effectiveToken && !effectiveUsername) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    const col = await getSubscriberSettingsCollection();
    const orConditions: any[] = [];
    if (effectiveToken && effectiveToken !== 'demo-token') {
      orConditions.push({ streamerToken: effectiveToken });
    }
    if (token && token !== 'demo-token' && token !== effectiveToken) {
      orConditions.push({ streamerToken: token });
    }
    if (effectiveUsername && effectiveUsername !== 'streamer') {
      orConditions.push({ streamerUsername: effectiveUsername });
    }
    if (username && username !== 'streamer' && username !== effectiveUsername) {
      orConditions.push({ streamerUsername: username });
    }

    const query: any = orConditions.length > 0
      ? { $or: orConditions }
      : (token ? { streamerToken: token } : { streamerUsername: username || '' });

    const docs = await col.find(query).sort({ updatedAt: -1, _id: -1 }).toArray();
    let doc = docs.find((d) => Array.isArray(d.tiers) && d.tiers.length > 0) || docs[0];

    if (!doc) {
      return NextResponse.json({
        success: true,
        settings: {
          streamerToken: effectiveToken || token || '',
          streamerUsername: effectiveUsername || username || '',
          enabled: true,
          tiers: [],
          telegramOutletGroup: null
        }
      });
    }

    // Sync token if streamer regenerated their token
    if (effectiveToken && doc.streamerToken !== effectiveToken) {
      await col.updateOne({ _id: doc._id }, { $set: { streamerToken: effectiveToken, updatedAt: new Date() } });
      doc.streamerToken = effectiveToken;
    }

    return NextResponse.json({
      success: true,
      settings: {
        streamerToken: doc.streamerToken,
        streamerUsername: doc.streamerUsername,
        enabled: doc.enabled !== false,
        tiers: Array.isArray(doc.tiers) ? doc.tiers : [],
        telegramOutletGroup: doc.telegramOutletGroup || null
      }
    });
  } catch (error: any) {
    console.error('Failed to get subscriber settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || body.streamerToken;
    const username = body.username || body.streamerUsername;
    const authUser = getAuthenticatedUser(req);

    const usersCol = await getUsersCollection();
    let userDoc: any = null;

    if (authUser?.id) {
      userDoc = await usersCol.findOne({
        $or: [{ userId: authUser.id }, { id: authUser.id as any }]
      });
    }

    if (!userDoc && token && token !== 'demo-token') {
      userDoc = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token }]
      });
    }

    if (!userDoc && username && username !== 'streamer') {
      userDoc = await usersCol.findOne({ username });
    }

    const effectiveToken = userDoc?.overlayToken || token || '';
    const effectiveUsername = userDoc?.username || username || '';
    const streamerUserId = userDoc?.userId || (userDoc as any)?.id || String(userDoc?._id || '');

    if (!effectiveToken && !effectiveUsername) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    const col = await getSubscriberSettingsCollection();
    const orConditions: any[] = [];
    if (effectiveToken && effectiveToken !== 'demo-token') {
      orConditions.push({ streamerToken: effectiveToken });
    }
    if (token && token !== 'demo-token' && token !== effectiveToken) {
      orConditions.push({ streamerToken: token });
    }
    if (effectiveUsername && effectiveUsername !== 'streamer') {
      orConditions.push({ streamerUsername: effectiveUsername });
    }

    const query: any = orConditions.length > 0
      ? { $or: orConditions }
      : (token ? { streamerToken: token } : { streamerUsername: effectiveUsername || '' });

    if (Array.isArray(body.tiers) && body.tiers.length > 10) {
      return NextResponse.json(
        { error: 'Maximum limit of 10 subscriber tiers allowed' },
        { status: 400 }
      );
    }

    const updateDoc: Partial<SubscriberSettingsDoc> = {
      streamerToken: effectiveToken || token || '',
      streamerUsername: effectiveUsername || '',
      enabled: body.enabled !== false,
      tiers: Array.isArray(body.tiers) ? body.tiers.slice(0, 10) : [],
      updatedAt: new Date()
    };

    if (body.telegramOutletGroup !== undefined) {
      updateDoc.telegramOutletGroup = body.telegramOutletGroup;

      // If streamer provided an outlet group, ensure it's registered into telegram_monitored_groups
      if (body.telegramOutletGroup?.chatId && streamerUserId) {
        try {
          await addMongoMonitoredGroup(
            streamerUserId,
            body.telegramOutletGroup.chatId,
            body.telegramOutletGroup.title || 'Subscriber Telegram Outlet Group',
            body.telegramOutletGroup.username
          );
          await telegramUserManager.notifyGroupsChanged(streamerUserId);
        } catch (groupErr) {
          console.warn('[Subscribers Settings] Could not auto-register monitored group:', groupErr);
        }
      }
    }

    await col.updateOne(
      query,
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    // Clean up older duplicate documents for this streamer
    if (effectiveUsername) {
      await col.deleteMany({
        streamerUsername: effectiveUsername,
        streamerToken: { $ne: updateDoc.streamerToken }
      });
    }

    const io = getIO();
    if (io) {
      if (effectiveToken) {
        io.to(`overlay:${effectiveToken}`).emit('subscribers:settings_updated', updateDoc);
        io.to(`dashboard:${effectiveToken}`).emit('subscribers:settings_updated', updateDoc);
      }
      if (token && token !== effectiveToken) {
        io.to(`overlay:${token}`).emit('subscribers:settings_updated', updateDoc);
        io.to(`dashboard:${token}`).emit('subscribers:settings_updated', updateDoc);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber settings updated successfully',
      settings: updateDoc
    });
  } catch (error: any) {
    console.error('Failed to save subscriber settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
