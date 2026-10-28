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
        const row = db.prepare('SELECT username FROM streamers WHERE id = ?').get(paramStreamerId) as any;
        if (row?.username) streamerUsername = row.username;
      } catch (e) {}
    } else if (paramUsername) {
      try {
        const row = db.prepare('SELECT id, username FROM streamers WHERE username = ?').get(paramUsername) as any;
        if (row?.id) {
          streamerId = row.id;
          streamerUsername = row.username;
        }
      } catch (e) {}
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
      // Ensure columns exist in SQLite
      try {
        db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_image TEXT');
        db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_filename TEXT');
        db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_filesize INTEGER');
        db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_mimetype TEXT');
        db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_updated_at DATETIME');
      } catch (e) {}

      sqliteSettings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(effectiveStreamerId) as any;
    } catch (e) {}

    // 2. Check MongoDB for this streamer
    let mongoConfig: any = null;
    try {
      const gatewayCol = await getGatewayConfigCollection();
      mongoConfig = await gatewayCol.findOne({
        $or: [
          { _id: `khqr_${effectiveStreamerId}` },
          { streamerId: effectiveStreamerId }
        ]
      });
    } catch (e) {}

    // Combine streamer-scoped settings
    const khqrImageUrl = mongoConfig?.khqrImageUrl || sqliteSettings?.master_khqr_image || '';
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
