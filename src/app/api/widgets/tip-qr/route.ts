import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || searchParams.get('streamerToken') || '';
    const username = searchParams.get('username') || '';

    let streamer: any = null;

    // 1. Try finding by overlay token in SQLite
    if (token) {
      streamer = db.prepare(`
        SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.is_verified, s.overlay_token,
               a.glow_color, a.template_style
        FROM streamers s
        LEFT JOIN alert_settings a ON s.id = a.streamer_id
        WHERE s.overlay_token = ? OR s.id = ?
        LIMIT 1
      `).get(token, token);
    }

    // 2. If not found by token, try finding by username in SQLite
    if (!streamer && (username || token)) {
      const cleanUser = (username || token).replace(/^@/, '').toLowerCase();
      streamer = db.prepare(`
        SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.is_verified, s.overlay_token,
               a.glow_color, a.template_style
        FROM streamers s
        LEFT JOIN alert_settings a ON s.id = a.streamer_id
        WHERE LOWER(s.username) = ?
        LIMIT 1
      `).get(cleanUser);
    }

    // 3. Fallback to MongoDB if not found in SQLite
    if (!streamer && (token || username)) {
      try {
        const usersCol = await getUsersCollection();
        const query: any = {};
        if (token) {
          query.$or = [{ overlayToken: token }, { userId: token }];
        }
        if (username) {
          const cleanUser = username.replace(/^@/, '').toLowerCase();
          query.$or = [
            ...(query.$or || []),
            { username: { $regex: new RegExp(`^${cleanUser}$`, 'i') } }
          ];
        }

        const mongoUser = await usersCol.findOne(query);
        if (mongoUser) {
          streamer = {
            id: mongoUser.userId || mongoUser._id?.toString(),
            username: mongoUser.username,
            display_name: mongoUser.displayName || mongoUser.username,
            avatar_url: mongoUser.avatarUrl || '',
            bio: mongoUser.bio || '',
            is_verified: mongoUser.isVerified ? 1 : 0,
            overlay_token: mongoUser.overlayToken || token,
            glow_color: '#00F0FF',
            template_style: 'neon-box'
          };
        }
      } catch (e) {
        console.warn('[Tip QR API] MongoDB fallback lookup error:', e);
      }
    }

    // 4. Fallback for demo token or preview
    if (!streamer) {
      const isDemo = !token || token === 'demo-token' || token === 'demo_token';
      streamer = {
        id: 'demo-streamer',
        username: isDemo ? 'neonstreamer' : (username || 'streamer'),
        display_name: isDemo ? 'Neon Streamer 🔥' : (username || 'Streamer'),
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=neonstreamer',
        bio: 'Live streaming on StreamBotKH',
        is_verified: 1,
        overlay_token: token || 'demo-token',
        glow_color: '#00F0FF',
        template_style: 'neon-box'
      };
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
        avatarUrl: streamer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`,
        bio: streamer.bio || '',
        isVerified: streamer.is_verified === 1,
        glowColor: streamer.glow_color || '#00F0FF',
        templateStyle: streamer.template_style || 'neon-box',
        overlayToken: streamer.overlay_token,
        donateUrl
      }
    });
  } catch (err: any) {
    console.error('API /api/widgets/tip-qr error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
