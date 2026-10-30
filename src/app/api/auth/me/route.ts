import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let streamer = db.prepare(`
    SELECT id, email, username, display_name, avatar_url, bio, plan,
           plan_started_at, plan_expires_at, plan_duration_days,
           overlay_token, telegram_chat_id, telegram_pairing_code, created_at
    FROM streamers WHERE id = ?
  `).get(user.id) as any;

  if (!streamer && user.email) {
    streamer = db.prepare(`
      SELECT id, email, username, display_name, avatar_url, bio, plan,
             plan_started_at, plan_expires_at, plan_duration_days,
             overlay_token, telegram_chat_id, telegram_pairing_code, created_at
      FROM streamers WHERE LOWER(email) = LOWER(?)
    `).get(user.email) as any;
  }

  // If streamer has no avatar in SQLite, check MongoDB Atlas for saved custom avatar
  if (streamer && (!streamer.avatar_url || !streamer.avatar_url.trim())) {
    try {
      const usersCol = await getUsersCollection();
      const mongoUser = await usersCol.findOne({ userId: streamer.id });
      if (mongoUser?.avatarUrl && mongoUser.avatarUrl.trim()) {
        db.prepare('UPDATE streamers SET avatar_url = ? WHERE id = ?').run(mongoUser.avatarUrl.trim(), streamer.id);
        streamer.avatar_url = mongoUser.avatarUrl.trim();
      }
    } catch (e) {}
  }

  // Fallback: If not in SQLite (e.g. after container redeploy), restore from MongoDB Atlas
  if (!streamer) {
    try {
      const usersCol = await getUsersCollection();
      const escapedEmail = (user.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mongoUser = await usersCol.findOne({
        $or: [
          { userId: user.id },
          ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
        ]
      });

      if (mongoUser) {
        // Clean up any row that had the same email or username with a different ID
        const targetEmail = mongoUser.email || user.email || '';
        const targetUsername = mongoUser.username || user.username || 'streamer';
        if (targetEmail) {
          try {
            const conflicting = db.prepare('SELECT id FROM streamers WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)) AND id != ?').all(targetEmail, targetUsername, mongoUser.userId) as any[];
            for (const c of conflicting) {
              try {
                db.prepare('UPDATE donations SET streamer_id = ? WHERE streamer_id = ?').run(mongoUser.userId, c.id);
              } catch (e) {}
              try {
                db.prepare('DELETE FROM streamers WHERE id = ?').run(c.id);
              } catch (e) {}
            }
          } catch (e) {}
        }

        let overlayToken = mongoUser.overlayToken || '';
        if (overlayToken) {
          const inUse = db.prepare('SELECT id FROM streamers WHERE overlay_token = ? AND id != ?').get(overlayToken, mongoUser.userId);
          if (inUse) overlayToken = '';
        }
        if (!overlayToken) {
          overlayToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
        }

        let pairingCode = mongoUser.telegramPairingCode || '';
        if (pairingCode) {
          const inUse = db.prepare('SELECT id FROM streamers WHERE telegram_pairing_code = ? AND id != ?').get(pairingCode, mongoUser.userId);
          if (inUse) pairingCode = '';
        }
        if (!pairingCode) {
          for (let i = 0; i < 50; i++) {
            const candidate = 'NEON-' + Math.floor(100000 + Math.random() * 900000);
            const inUse = db.prepare('SELECT id FROM streamers WHERE telegram_pairing_code = ?').get(candidate);
            if (!inUse) {
              pairingCode = candidate;
              break;
            }
          }
          if (!pairingCode) {
            pairingCode = 'NEON-' + uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
          }
        }

        db.prepare(`
          INSERT INTO streamers (
            id, email, username, display_name, avatar_url, bio, custom_thanks_message, is_verified, plan, overlay_token, telegram_pairing_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            username = excluded.username,
            display_name = excluded.display_name,
            avatar_url = COALESCE(NULLIF(streamers.avatar_url, ''), excluded.avatar_url),
            overlay_token = COALESCE(streamers.overlay_token, excluded.overlay_token),
            telegram_pairing_code = COALESCE(streamers.telegram_pairing_code, excluded.telegram_pairing_code)
        `).run(
          mongoUser.userId,
          mongoUser.email || user.email || '',
          mongoUser.username || user.username || 'streamer',
          mongoUser.displayName || user.display_name || 'Streamer',
          mongoUser.avatarUrl || '',
          mongoUser.bio || '',
          mongoUser.customThanksMessage || '',
          mongoUser.isVerified ? 1 : 0,
          mongoUser.plan || 'free',
          overlayToken,
          pairingCode
        );

        streamer = db.prepare(`
          SELECT id, email, username, display_name, avatar_url, bio, plan,
                 plan_started_at, plan_expires_at, plan_duration_days,
                 overlay_token, telegram_chat_id, telegram_pairing_code, created_at
          FROM streamers WHERE id = ?
        `).get(mongoUser.userId) as any;
      }
    } catch (e) {
      console.warn('[auth/me] Failed to restore streamer from Mongo:', e);
    }
  }

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
  }

  // Ensure payment_settings and Master KHQR are verified and restored from MongoDB backup
  if (streamer.id) {
    try {
      const { restoreMasterKhqrImage } = await import('@/server/database/mongo');
      await restoreMasterKhqrImage(streamer.id, streamer.username);
    } catch (e) {}
  }

  // Automatically check 31-day plan expiration
  if (streamer.plan === 'pro' && streamer.plan_expires_at) {
    const expiresTime = new Date(streamer.plan_expires_at).getTime();
    if (!isNaN(expiresTime) && expiresTime < Date.now()) {
      db.prepare(`
        UPDATE streamers
        SET plan = 'free', plan_started_at = NULL, plan_expires_at = NULL, plan_duration_days = 0
        WHERE id = ?
      `).run(streamer.id);
      streamer.plan = 'free';
      streamer.plan_started_at = null;
      streamer.plan_expires_at = null;
      streamer.plan_duration_days = 0;
    }
  }

  return NextResponse.json({
    id: streamer.id,
    email: streamer.email,
    username: streamer.username,
    displayName: streamer.display_name,
    avatarUrl: streamer.avatar_url,
    bio: streamer.bio,
    plan: streamer.plan || 'free',
    planStartedAt: streamer.plan_started_at || null,
    planExpiresAt: streamer.plan_expires_at || null,
    planDurationDays: streamer.plan_duration_days || 0,
    isAdmin: isAdminEmail(streamer.email),
    overlayToken: streamer.overlay_token,
    telegramChatId: streamer.telegram_chat_id,
    telegramPairingCode: streamer.telegram_pairing_code,
    createdAt: streamer.created_at
  });
}
