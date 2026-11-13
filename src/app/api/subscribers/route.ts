import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscribersCollection,
  getSubscriberSettingsCollection,
  getUsersCollection,
  addMongoMonitoredGroup,
  buildSubscriberUsernameQuery,
  SubscriberDoc,
  SubscriberSettingsDoc
} from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { getIO } from '@/server/services/socketService';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export const dynamic = 'force-dynamic';

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

    if (!userDoc && token && token !== 'demo-token' && token !== 'demo_token') {
      userDoc = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token }]
      });
    }

    if (!userDoc && username && username !== 'streamer' && username !== 'Streamer') {
      userDoc = await usersCol.findOne({ username });
    }

    const effectiveToken = userDoc?.overlayToken || token || '';
    const effectiveUsername = userDoc?.username || username || '';

    if (!effectiveToken && !effectiveUsername) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    const [settingsCol, subCol] = await Promise.all([
      getSubscriberSettingsCollection(),
      getSubscribersCollection()
    ]);

    const orConditions: any[] = [];
    if (effectiveToken && effectiveToken !== 'demo-token' && effectiveToken !== 'demo_token') {
      orConditions.push({ streamerToken: effectiveToken });
    }
    if (token && token !== 'demo-token' && token !== 'demo_token' && token !== effectiveToken) {
      orConditions.push({ streamerToken: token });
    }
    if (effectiveUsername && effectiveUsername !== 'streamer' && effectiveUsername !== 'Streamer') {
      orConditions.push({ streamerUsername: effectiveUsername });
    }

    const settingsQuery: any = orConditions.length > 0
      ? { $or: orConditions }
      : (token ? { streamerToken: token } : { streamerUsername: username || '' });

    const [docs, subscribers] = await Promise.all([
      settingsCol.find(settingsQuery).sort({ updatedAt: -1, _id: -1 }).toArray(),
      subCol.find(settingsQuery).sort({ subscribedAt: -1 }).toArray()
    ]);

    const doc = docs.find((d) => Array.isArray(d.tiers) && d.tiers.length > 0) || docs[0];
    const tiers = Array.isArray(doc?.tiers) ? doc.tiers : [];
    const telegramOutletGroup = doc?.telegramOutletGroup || null;

    const activeList = subscribers.filter((s) => s.status === 'active' && new Date(s.expiresAt) > new Date());
    const totalRevenueUsd = activeList.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

    return NextResponse.json({
      success: true,
      tiers,
      subscribers,
      telegramOutletGroup,
      settings: {
        streamerToken: doc?.streamerToken || effectiveToken || token || '',
        streamerUsername: doc?.streamerUsername || effectiveUsername || username || '',
        enabled: doc?.enabled !== false,
        tiers,
        telegramOutletGroup
      },
      stats: {
        totalActive: activeList.length,
        totalHistorical: subscribers.length,
        monthlyRevenueUsd: parseFloat(totalRevenueUsd.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error('Failed to get /api/subscribers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
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

    if (!userDoc && token && token !== 'demo-token' && token !== 'demo_token') {
      userDoc = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token }]
      });
    }

    if (!userDoc && username && username !== 'streamer' && username !== 'Streamer') {
      userDoc = await usersCol.findOne({ username });
    }

    const effectiveToken = userDoc?.overlayToken || token || '';
    const effectiveUsername = userDoc?.username || username || '';
    const streamerUserId = userDoc?.userId || (userDoc as any)?.id || String(userDoc?._id || '');

    const settingsCol = await getSubscriberSettingsCollection();
    const subCol = await getSubscribersCollection();

    // 1. Delete subscriber member
    if (action === 'delete_subscriber' || action === 'delete_subscription') {
      const subId = body.subscriberId || body.id;
      if (!subId) {
        return NextResponse.json({ success: false, error: 'Subscriber ID required' }, { status: 400 });
      }
      await subCol.deleteOne({ id: subId });
      return NextResponse.json({ success: true, message: 'Subscriber removed' });
    }

    // 2. Manual add subscriber member
    if (action === 'add_subscriber' || action === 'manual_add') {
      const subInput = body.subscriber || body;
      const subscriberName = String(subInput.subscriberName || '').slice(0, 25).trim();
      if (!subscriberName) {
        return NextResponse.json({ success: false, error: 'Subscriber name required' }, { status: 400 });
      }

      const now = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const newSub: SubscriberDoc = {
        id: subInput.id || `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        streamerToken: effectiveToken || token || '',
        streamerUsername: effectiveUsername || '',
        subscriberName,
        youtubeHandle: subscriberName.replace(/^@+/, '').trim(),
        tierId: subInput.tierId || '',
        tierName: subInput.tierName || 'VIP Member',
        price: Number(subInput.price || subInput.totalAmountPaid) || 4.99,
        currency: subInput.currency || 'USD',
        badgeText: subInput.badgeText || 'VIP',
        badgeColor: subInput.badgeColor || '#FFFFFF',
        badgeBg: subInput.badgeBg || 'rgba(0, 240, 255, 0.2)',
        badgeBorder: subInput.badgeBorder || 'rgba(0, 240, 255, 0.4)',
        badgeIcon: subInput.badgeIcon || 'Crown',
        badgeGifUrl: subInput.badgeGifUrl || subInput.badgeImage,
        badgeImage: subInput.badgeImage || subInput.badgeGifUrl,
        paymentMethod: subInput.paymentMethod || 'manual_gift',
        status: 'active',
        subscribedAt: now,
        expiresAt
      };

      await subCol.updateOne(
        {
          streamerToken: effectiveToken || token || '',
          ...buildSubscriberUsernameQuery(subscriberName)
        },
        { $set: newSub },
        { upsert: true }
      );

      const io = getIO();
      if (io && effectiveToken) {
        io.to(`overlay:${effectiveToken}`).emit('subscriber:new', newSub);
        io.to(`dashboard:${effectiveToken}`).emit('subscriber:new', newSub);
      }

      return NextResponse.json({ success: true, subscriber: newSub });
    }

    // 3. Test badge comment on live chat
    if (action === 'test_comment') {
      const io = getIO();
      const targetToken = effectiveToken || token || 'demo-token';
      const author = body.username || 'Member_VIP';
      const chatMsg = {
        id: `test_sub_${Date.now()}`,
        platform: 'youtube',
        author,
        message: 'Hyped to be a proud channel member! 🔥✨',
        timestamp: new Date().toISOString(),
        badge: 'VIP',
        badgeColor: '#FFFFFF',
        badgeIcon: 'Crown',
        isSubscriber: true,
        isTest: true
      };
      if (io) {
        io.to(`overlay:${targetToken}`).emit('chat:message', chatMsg);
      }
      return NextResponse.json({ success: true, message: chatMsg });
    }

    // 4. Set Telegram outlet group or save tiers
    const orConditions: any[] = [];
    if (effectiveToken && effectiveToken !== 'demo-token' && effectiveToken !== 'demo_token') {
      orConditions.push({ streamerToken: effectiveToken });
    }
    if (token && token !== 'demo-token' && token !== 'demo_token' && token !== effectiveToken) {
      orConditions.push({ streamerToken: token });
    }
    if (effectiveUsername && effectiveUsername !== 'streamer' && effectiveUsername !== 'Streamer') {
      orConditions.push({ streamerUsername: effectiveUsername });
    }

    const query: any = orConditions.length > 0
      ? { $or: orConditions }
      : (token ? { streamerToken: token } : { streamerUsername: effectiveUsername || '' });

    const updateDoc: Partial<SubscriberSettingsDoc> = {
      streamerToken: effectiveToken || token || '',
      streamerUsername: effectiveUsername || '',
      updatedAt: new Date()
    };

    if (Array.isArray(body.tiers)) {
      updateDoc.tiers = body.tiers;
      updateDoc.enabled = body.enabled !== false;
    }

    const outletArg = body.outletGroup !== undefined ? body.outletGroup : body.telegramOutletGroup;
    if (outletArg !== undefined) {
      updateDoc.telegramOutletGroup = outletArg;
      if (outletArg?.chatId && streamerUserId) {
        try {
          await addMongoMonitoredGroup(
            streamerUserId,
            outletArg.chatId,
            outletArg.title || 'Subscriber Telegram Outlet Group',
            outletArg.username
          );
          await telegramUserManager.notifyGroupsChanged(streamerUserId);
        } catch (groupErr) {
          console.warn('[Subscribers] Could not auto-register monitored group:', groupErr);
        }
      }
    }

    await settingsCol.updateOne(
      query,
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    const io = getIO();
    if (io && effectiveToken) {
      io.to(`overlay:${effectiveToken}`).emit('subscribers:settings_updated', updateDoc);
      io.to(`dashboard:${effectiveToken}`).emit('subscribers:settings_updated', updateDoc);
    }

    return NextResponse.json({
      success: true,
      settings: updateDoc
    });
  } catch (error: any) {
    console.error('Failed to handle POST /api/subscribers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
