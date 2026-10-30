import { NextRequest, NextResponse } from 'next/server';
import {
  getMongoDb,
  getUsersCollection,
  getGatewayConfigCollection,
  getPaymentSettingsCollection,
  restoreMasterKhqrImage
} from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || searchParams.get('streamerToken') || '';
    const username = searchParams.get('username') || '';

    let streamer: any = null;

    // 1. Lookup streamer in MongoDB by overlay token / userId / username
    if (token || username) {
      try {
        const usersCol = await getUsersCollection();
        const or: any[] = [];
        if (token) {
          or.push({ overlayToken: token }, { userId: token });
        }
        const cleanUser = (username || token).replace(/^@/, '').toLowerCase();
        if (cleanUser) {
          const escaped = cleanUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          or.push({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } });
        }

        let mongoUser: any = await usersCol.findOne({ $or: or } as any);

        // Per-feature overlay tokens (regenerated from Assets) & historical tokens
        if (!mongoUser && token) {
          const db = await getMongoDb();
          const overlayDoc: any = await db
            .collection('overlays')
            .findOne({ $or: [{ overlayToken: token }, { token }] });
          let ownerId: string | undefined = overlayDoc?.userId;
          if (!ownerId) {
            const histDoc: any = await db.collection('overlay_token_history').findOne({ token });
            ownerId = histDoc?.streamerId;
          }
          if (ownerId) {
            mongoUser = await usersCol.findOne({ $or: [{ userId: ownerId }, { id: ownerId }] } as any);
          }
        }
        if (mongoUser) {
          streamer = {
            id: mongoUser.userId || mongoUser._id?.toString(),
            username: mongoUser.username,
            display_name: mongoUser.displayName || mongoUser.username,
            avatar_url: mongoUser.avatarUrl || '',
            overlay_token: mongoUser.overlayToken || token
          };
        }
      } catch (e) {
        console.warn('[Tip QR API] MongoDB lookup error:', e);
      }
    }

    // 2. Fallback for demo token or preview
    if (!streamer) {
      const isDemo = !token || token === 'demo-token' || token === 'demo_token';
      streamer = {
        id: 'demo-streamer',
        username: isDemo ? 'neonstreamer' : (username || 'streamer'),
        display_name: isDemo ? 'Neon Streamer' : (username || 'Streamer'),
        avatar_url: '',
        overlay_token: token || 'demo-token'
      };
    }

    // 3. Resolve the streamer's uploaded Master KHQR image from MongoDB
    let khqrImageUrl = '';
    if (streamer.id !== 'demo-streamer') {
      const streamerId = streamer.id;
      const cleanUsername = String(streamer.username || '').toLowerCase();
      try {
        const restoreResult = await restoreMasterKhqrImage(streamerId, cleanUsername);
        if (restoreResult.restored && restoreResult.khqrImageUrl) {
          khqrImageUrl = restoreResult.khqrImageUrl;
        } else {
          const gatewayCol = await getGatewayConfigCollection();
          const gatewayDoc: any = await gatewayCol.findOne({
            $or: [
              { _id: `khqr_${streamerId}` },
              { streamerId },
              { _id: `khqr_${cleanUsername}` },
              { streamerId: cleanUsername }
            ]
          } as any);
          if (gatewayDoc?.khqrImageUrl) khqrImageUrl = gatewayDoc.khqrImageUrl;
        }
      } catch (e) {
        console.warn('[Tip QR API] KHQR gateway lookup error:', e);
      }

      if (!khqrImageUrl) {
        try {
          const paymentCol = await getPaymentSettingsCollection();
          const ps: any = await paymentCol.findOne({ streamerId });
          khqrImageUrl = ps?.masterKhqrImage || ps?.master_khqr_image || '';
        } catch (e) {
          console.warn('[Tip QR API] Payment settings lookup error:', e);
        }
      }
    }

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:5173';
    const origin = `${protocol}://${host}`;
    const donateUrl = `${origin}/@${streamer.username}`;

    return NextResponse.json({
      success: true,
      streamer: {
        id: streamer.id,
        username: streamer.username,
        displayName: streamer.display_name || streamer.username,
        avatarUrl: streamer.avatar_url || '',
        overlayToken: streamer.overlay_token,
        khqrImageUrl,
        donateUrl
      }
    });
  } catch (err: any) {
    console.error('API /api/widgets/tip-qr error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
