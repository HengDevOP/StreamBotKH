import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscribersCollection,
  getSubscriberSettingsCollection,
  getUsersCollection,
  buildSubscriberUsernameQuery,
  SubscriberDoc
} from '@/server/database/mongo';
import { getIO } from '@/server/services/socketService';
import { DEFAULT_SUBSCRIBER_TIERS } from '@/types/subscriber';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const username = searchParams.get('username');

    if (!token && !username) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    const subCol = await getSubscribersCollection();
    const query: any = {};
    if (token) query.streamerToken = token;
    if (username) query.streamerUsername = username;

    const list = await subCol
      .find(query)
      .sort({ subscribedAt: -1 })
      .toArray();

    const activeList = list.filter((s) => s.status === 'active' && new Date(s.expiresAt) > new Date());
    const totalRevenueUsd = activeList.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

    return NextResponse.json({
      success: true,
      subscribers: list,
      stats: {
        totalActive: activeList.length,
        totalHistorical: list.length,
        monthlyRevenueUsd: parseFloat(totalRevenueUsd.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error('Failed to get subscribers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'create_subscription';

    const subCol = await getSubscribersCollection();
    const settingsCol = await getSubscriberSettingsCollection();

    // ACTION 1: Check subscriber badge by username
    if (action === 'check_subscriber') {
      const { subscriberName, streamerToken, streamerUsername } = body;
      if (!subscriberName) {
        return NextResponse.json({ success: false, isSubscriber: false });
      }

      const query: any = {
        status: 'active',
        expiresAt: { $gt: new Date() },
        ...buildSubscriberUsernameQuery(subscriberName)
      };

      if (streamerToken) query.streamerToken = streamerToken;
      else if (streamerUsername) query.streamerUsername = streamerUsername;

      const sub = await subCol.findOne(query);
      if (!sub) {
        return NextResponse.json({ success: true, isSubscriber: false });
      }

      return NextResponse.json({
        success: true,
        isSubscriber: true,
        subscriber: {
          name: sub.subscriberName,
          tierName: sub.tierName,
          badgeText: sub.badgeText,
          badgeColor: sub.badgeColor,
          badgeBg: sub.badgeBg,
          badgeBorder: sub.badgeBorder,
          badgeIcon: sub.badgeIcon,
          badgeGifUrl: sub.badgeGifUrl || sub.badgeImage,
          badgeImage: sub.badgeImage || sub.badgeGifUrl
        }
      });
    }

    // ACTION 2: Create / Subscribe (from Donation Page or Simulator)
    if (action === 'create_subscription' || action === 'manual_add') {
      const {
        streamerUsername,
        streamerToken,
        subscriberName,
        tierId,
        paymentMethod = 'bakong_khqr',
        donorMessage = '',
        transactionId
      } = body;

      if (!subscriberName) {
        return NextResponse.json({ success: false, error: 'Subscriber name is required' }, { status: 400 });
      }

      // Resolve streamer info
      let token = streamerToken;
      let username = streamerUsername;

      if (!token && username) {
        const usersCol = await getUsersCollection();
        const user = await usersCol.findOne({ username });
        if (user) {
          token = user.overlayToken || '';
        }
      } else if (token && !username) {
        const usersCol = await getUsersCollection();
        const user = await usersCol.findOne({ overlayToken: token });
        if (user) {
          username = user.username;
        }
      }

      // Fetch streamer tiers
      const settings = await settingsCol.findOne({
        $or: [{ streamerToken: token }, { streamerUsername: username }]
      });

      const tiers = Array.isArray(settings?.tiers) ? settings.tiers : [];
      const selectedTier = tiers.find((t) => t.id === tierId) || tiers[0];

      if (!selectedTier) {
        return NextResponse.json({ success: false, error: 'No subscription tier configured by streamer' }, { status: 400 });
      }

      const cleanSubName = String(subscriberName).trim();
      const youtubeHandle = cleanSubName.replace(/^@+/, '').trim();
      const subscribedAt = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day membership

      const newSub: SubscriberDoc = {
        id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        streamerToken: token || '',
        streamerUsername: username || '',
        subscriberName: cleanSubName,
        youtubeHandle,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        price: selectedTier.price,
        currency: selectedTier.currency || 'USD',
        badgeText: selectedTier.badgeText,
        badgeColor: selectedTier.badgeColor,
        badgeBg: selectedTier.badgeBg || 'rgba(0, 240, 255, 0.2)',
        badgeBorder: selectedTier.badgeBorder || 'rgba(0, 240, 255, 0.4)',
        badgeIcon: selectedTier.badgeIcon || 'Crown',
        badgeGifUrl: selectedTier.badgeGifUrl || selectedTier.badgeImage,
        badgeImage: selectedTier.badgeImage || selectedTier.badgeGifUrl,
        paymentMethod,
        status: 'active',
        subscribedAt,
        expiresAt,
        donorMessage: donorMessage ? String(donorMessage).trim() : undefined,
        transactionId
      };

      // Upsert subscriber record so renewing resets expiration date
      await subCol.updateOne(
        {
          streamerToken: token || '',
          ...buildSubscriberUsernameQuery(cleanSubName)
        },
        {
          $set: newSub
        },
        { upsert: true }
      );

      // Emit real-time event to overlay and dashboard
      const io = getIO();
      if (io && token) {
        io.to(`overlay:${token}`).emit('subscriber:new', newSub);
        io.to(`dashboard:${token}`).emit('subscriber:new', newSub);
        if (token !== 'demo-token') {
          io.to('overlay:demo-token').emit('subscriber:new', newSub);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully subscribed to ${selectedTier.name}!`,
        subscriber: newSub
      });
    }

    // ACTION 3: Cancel / Revoke Subscription
    if (action === 'cancel_subscription') {
      const { id, subscriberName, streamerToken } = body;
      const query: any = {};
      if (id) query.id = id;
      else if (subscriberName && streamerToken) {
        query.streamerToken = streamerToken;
        query.subscriberName = subscriberName;
      }

      await subCol.updateOne(query, { $set: { status: 'cancelled' } });

      return NextResponse.json({
        success: true,
        message: 'Subscription marked as cancelled'
      });
    }

    // ACTION 4: Delete Subscription
    if (action === 'delete_subscription') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Subscription id required' }, { status: 400 });
      }

      await subCol.deleteOne({ id });

      return NextResponse.json({
        success: true,
        message: 'Subscription deleted'
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to handle subscribers action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
