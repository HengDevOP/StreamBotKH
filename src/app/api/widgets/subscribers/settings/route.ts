import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriberSettingsCollection,
  getUsersCollection,
  SubscriberSettingsDoc,
  SubscriberTierDoc
} from '@/server/database/mongo';
import { getIO } from '@/server/services/socketService';
import { DEFAULT_SUBSCRIBER_TIERS } from '@/types/subscriber';

export const dynamic = 'force-dynamic';
export { DEFAULT_SUBSCRIBER_TIERS };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const username = searchParams.get('username');

    if (!token && !username) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    const col = await getSubscriberSettingsCollection();
    const query: any = {};
    if (token) query.streamerToken = token;
    else if (username) query.streamerUsername = username;

    let doc = await col.findOne(query);

    if (!doc) {
      return NextResponse.json({
        success: true,
        settings: {
          streamerToken: token || '',
          streamerUsername: username || '',
          enabled: true,
          tiers: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        streamerToken: doc.streamerToken,
        streamerUsername: doc.streamerUsername,
        enabled: doc.enabled !== false,
        tiers: Array.isArray(doc.tiers) ? doc.tiers : []
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

    if (!token && !username) {
      return NextResponse.json({ success: false, error: 'Token or username required' }, { status: 400 });
    }

    // Verify user exists and check plan permissions if token provided
    let effectiveUsername = username;
    if (token && token !== 'demo-token') {
      const usersCol = await getUsersCollection();
      const user = await usersCol.findOne({ overlayToken: token });
      if (user) {
        effectiveUsername = user.username;
      }
    }

    const col = await getSubscriberSettingsCollection();
    const query: any = token ? { streamerToken: token } : { streamerUsername: effectiveUsername };

    const updateDoc: Partial<SubscriberSettingsDoc> = {
      streamerToken: token || '',
      streamerUsername: effectiveUsername || '',
      enabled: body.enabled !== false,
      tiers: Array.isArray(body.tiers) ? body.tiers : [],
      updatedAt: new Date()
    };

    await col.updateOne(
      query,
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    const io = getIO();
    if (io && token) {
      io.to(`overlay:${token}`).emit('subscribers:settings_updated', updateDoc);
      io.to(`dashboard:${token}`).emit('subscribers:settings_updated', updateDoc);
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
