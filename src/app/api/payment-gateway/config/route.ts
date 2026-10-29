import { NextRequest, NextResponse } from 'next/server';
import { getGatewayConfigCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';
import { getAuthenticatedUser } from '@/server/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramStreamerId = searchParams.get('streamerId');
    const paramUsername = searchParams.get('username');

    let streamerId: string | null = null;
    let streamerUsername: string | null = null;

    if (paramStreamerId) {
      streamerId = paramStreamerId;
      try {
        const row = db.prepare('SELECT id, username FROM streamers WHERE id = ? OR LOWER(username) = LOWER(?)').get(paramStreamerId, paramStreamerId) as any;
        if (row?.username) streamerUsername = row.username;
        if (row?.id) streamerId = row.id;
      } catch (e) {}

      if (!streamerUsername) {
        try {
          const usersCol = await (await import('@/server/database/mongo')).getUsersCollection();
          const mUser = await usersCol.findOne({
            $or: [{ userId: paramStreamerId }, { username: { $regex: new RegExp(`^${paramStreamerId}$`, 'i') } }]
          });
          if (mUser?.username) streamerUsername = mUser.username;
          if (mUser?.userId) streamerId = mUser.userId;
        } catch (e) {}
      }
    }

    if (paramUsername) {
      const clean = paramUsername.replace(/^@/, '').trim();
      try {
        const row = db.prepare('SELECT id, username FROM streamers WHERE LOWER(username) = LOWER(?) OR id = ?').get(clean, clean) as any;
        if (row?.id) {
          streamerId = row.id;
          streamerUsername = row.username;
        }
      } catch (e) {}

      if (!streamerId) {
        try {
          const usersCol = await (await import('@/server/database/mongo')).getUsersCollection();
          const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const mUser = await usersCol.findOne({
            $or: [{ username: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { userId: clean }]
          });
          if (mUser?.userId) {
            streamerId = mUser.userId;
            streamerUsername = mUser.username;
          }
        } catch (e) {}
      }
    }

    if (!streamerId) {
      const authUser = getAuthenticatedUser(req);
      if (authUser?.id) {
        streamerId = authUser.id;
        streamerUsername = authUser.username;
      }
    }

    const effectiveStreamerId = streamerId || 'demo-streamer-id-1001';

    // 1. Check SQLite payment_settings for this streamer
    let sqliteSettings: any = null;
    try {
      sqliteSettings = db.prepare(`
        SELECT * FROM payment_settings 
        WHERE streamer_id = ? 
           OR streamer_id = ?
      `).get(effectiveStreamerId, streamerId || '') as any;
    } catch (e) {}

    // 2. Check MongoDB for this streamer
    let mongoConfig: any = null;
    try {
      const gatewayCol = await getGatewayConfigCollection();
      // Look for streamer-specific config with non-empty image first
      mongoConfig = await gatewayCol.findOne({
        $and: [
          {
            $or: [
              { _id: `khqr_${effectiveStreamerId}` },
              { streamerId: effectiveStreamerId },
              ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
            ]
          },
          { khqrImageUrl: { $exists: true, $ne: '' } }
        ]
      });

      // If not found, find any existing document for this streamer
      if (!mongoConfig) {
        mongoConfig = await gatewayCol.findOne({
          $or: [
            { _id: `khqr_${effectiveStreamerId}` },
            { streamerId: effectiveStreamerId },
            ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
          ]
        });
      }
    } catch (e) {}

    // Combine streamer-scoped settings: MongoDB is primary. If mongoConfig explicitly has khqrImageUrl, respect it (including empty string when removed)
    let khqrImageUrl = '';
    if (mongoConfig && typeof mongoConfig.khqrImageUrl === 'string' && mongoConfig.khqrImageUrl.trim() !== '') {
      khqrImageUrl = mongoConfig.khqrImageUrl.trim();
    } else if (sqliteSettings && typeof sqliteSettings.master_khqr_image === 'string' && sqliteSettings.master_khqr_image.trim() !== '') {
      khqrImageUrl = sqliteSettings.master_khqr_image.trim();
    } else if (effectiveStreamerId === 'demo-streamer-id-1001') {
      try {
        const gatewayCol = await getGatewayConfigCollection();
        const globalConfig = await gatewayCol.findOne({ _id: 'master_khqr_config', khqrImageUrl: { $exists: true, $ne: '' } });
        if (globalConfig?.khqrImageUrl) khqrImageUrl = globalConfig.khqrImageUrl;
      } catch (e) {}
    }

    const khqrFilename = mongoConfig?.khqrFilename || sqliteSettings?.master_khqr_filename || '';
    const khqrFileSize = mongoConfig?.khqrFileSize || sqliteSettings?.master_khqr_filesize || 0;
    const khqrMimeType = mongoConfig?.khqrMimeType || sqliteSettings?.master_khqr_mimetype || '';

    const bankAccountName =
      sqliteSettings?.bakong_account_name ||
      mongoConfig?.bankAccountName ||
      (streamerUsername ? `${streamerUsername.toUpperCase()} OFFICIAL KHQR` : 'STREAMBOTKH OFFICIAL KHQR');

    const bakongAccountId =
      sqliteSettings?.bakong_account_id ||
      mongoConfig?.bakongAccountId ||
      (streamerUsername ? `${streamerUsername.toLowerCase()}@abaa` : 'streambotkh@abaa');

    const config = {
      _id: `khqr_${effectiveStreamerId}`,
      streamerId: effectiveStreamerId,
      khqrImageUrl,
      khqrFilename,
      khqrFileSize,
      khqrMimeType,
      bankAccountName,
      bakongAccountId,
      updatedAt: mongoConfig?.updatedAt || sqliteSettings?.master_khqr_updated_at || new Date()
    };

    return NextResponse.json({
      success: true,
      config
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/config GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch payment gateway config' },
      { status: 500 }
    );
  }
}
