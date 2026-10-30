import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { getTemporaryDonationsCollection, getGatewayConfigCollection, restoreMasterKhqrImage } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      streamerId,
      donorName,
      donorMessage,
      amount,
      currency,
      bankingName,
      videoUrl,
      videoTitle,
      videoStartTime,
      videoEndTime
    } = body;

    if (!streamerId || !donorName) {
      return NextResponse.json(
        { error: 'streamerId and donorName are required' },
        { status: 400 }
      );
    }

    const numAmount = amount ? Math.max(0, parseFloat(amount) || 0) : 0;
    const validCurrency = currency === 'KHR' ? 'KHR' : 'USD';
    const donationId = uuidv4();
    const cleanBankingName = (bankingName && typeof bankingName === 'string')
      ? bankingName.slice(0, 60).trim()
      : 'Bakong KHQR';

    const cleanVideoUrl = videoUrl && typeof videoUrl === 'string' ? videoUrl.trim() : null;
    const cleanVideoTitle = videoTitle && typeof videoTitle === 'string' ? videoTitle.trim() : null;
    const cleanVideoStartTime = Number(videoStartTime) || 0;
    const cleanVideoEndTime = Number(videoEndTime) || 0;

    // Resolve target streamer ID and username across SQLite & MongoDB
    let resolvedStreamerId = streamerId;
    let resolvedUsername = '';

    try {
      const row = db.prepare('SELECT id, username FROM streamers WHERE id = ? OR LOWER(username) = LOWER(?)').get(streamerId, streamerId) as any;
      if (row?.id) {
        resolvedStreamerId = row.id;
        resolvedUsername = row.username || '';
      } else {
        const usersCol = await (await import('@/server/database/mongo')).getUsersCollection();
        const escaped = String(streamerId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mUser = await usersCol.findOne({
          $or: [
            { userId: streamerId },
            { username: { $regex: new RegExp(`^${escaped}$`, 'i') } }
          ]
        });
        if (mUser?.userId) {
          resolvedStreamerId = mUser.userId;
          resolvedUsername = mUser.username || '';
        }
      }
    } catch (e) {}

    // Use the official Payment Gateway Master KHQR image uploaded by the streamer (verified & restored)
    let khqrImage = '';
    try {
      const restoreResult = await restoreMasterKhqrImage(resolvedStreamerId, resolvedUsername);
      if (restoreResult.restored && restoreResult.khqrImageUrl) {
        khqrImage = restoreResult.khqrImageUrl;
      } else {
        const gatewayCol = await getGatewayConfigCollection();
        const streamerConfig = await gatewayCol.findOne({
          $or: [
            { _id: `khqr_${resolvedStreamerId}` },
            { streamerId: resolvedStreamerId },
            { _id: `khqr_${streamerId}` },
            { streamerId: streamerId },
            ...(resolvedUsername ? [{ _id: `khqr_${resolvedUsername}` }, { streamerId: resolvedUsername }] : [])
          ]
        });
        if (streamerConfig?.khqrImageUrl) {
          khqrImage = streamerConfig.khqrImageUrl;
        }
      }
    } catch (gatewayErr) {
      console.warn('[Donation] Could not fetch gateway KHQR image from MongoDB:', gatewayErr);
    }

    // 2. Check SQLite payment_settings table
    if (!khqrImage) {
      try {
        const sqliteSettings = db.prepare(`
          SELECT master_khqr_image FROM payment_settings 
          WHERE (streamer_id = ? OR streamer_id = ?) 
            AND master_khqr_image IS NOT NULL 
            AND master_khqr_image != ''
        `).get(resolvedStreamerId, streamerId) as any;

        if (sqliteSettings?.master_khqr_image) {
          khqrImage = sqliteSettings.master_khqr_image;
        }
      } catch (sqlErr) {
        console.warn('[Donation] Could not fetch KHQR from SQLite payment_settings:', sqlErr);
      }
    }

    // 3. Optional fallback to global master_khqr_config if non-empty
    if (!khqrImage) {
      try {
        const gatewayCol = await getGatewayConfigCollection();
        const globalConfig = await gatewayCol.findOne({
          _id: 'master_khqr_config',
          khqrImageUrl: { $exists: true, $ne: '' }
        });
        if (globalConfig?.khqrImageUrl) {
          khqrImage = globalConfig.khqrImageUrl;
        }
      } catch (e) {}
    }

    if (!khqrImage) {
      return NextResponse.json(
        { error: 'This streamer has not uploaded their Master KHQR code yet. Tips cannot be processed.' },
        { status: 400 }
      );
    }

    // 1. Save donation in pending state in SQLite ledger
    db.prepare(`
      INSERT INTO donations (
        id, streamer_id, donor_name, donor_message, amount, currency,
        banking_name, payment_method, qr_string, video_url, video_title,
        video_start_time, video_end_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      donationId,
      resolvedStreamerId,
      donorName.slice(0, 50),
      (donorMessage || '').slice(0, 250),
      numAmount,
      validCurrency,
      cleanBankingName,
      'BAKONG_KHQR',
      khqrImage,
      cleanVideoUrl,
      cleanVideoTitle,
      cleanVideoStartTime,
      cleanVideoEndTime
    );

    // 2. Store in temporary listener collection in MongoDB (100% MongoDB queue)
    try {
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.insertOne({
        id: donationId,
        streamerId: resolvedStreamerId,
        streamerUsername: resolvedUsername || undefined,
        donorName: donorName.slice(0, 50),
        donorMessage: (donorMessage || '').slice(0, 250),
        amount: numAmount,
        currency: validCurrency,
        bankingName: cleanBankingName,
        videoUrl: cleanVideoUrl || undefined,
        videoTitle: cleanVideoTitle || undefined,
        videoStartTime: cleanVideoStartTime,
        videoEndTime: cleanVideoEndTime,
        createdAt: new Date()
      });
    } catch (mongoErr) {
      console.warn('[Donation] Could not insert temporary MongoDB record:', mongoErr);
    }

    return NextResponse.json({
      donationId,
      amount: numAmount,
      currency: validCurrency,
      bankingName: cleanBankingName,
      qrString: khqrImage,
      qrImage: khqrImage,
      abaDeepLink: '',
      bakongDeepLink: '',
      expiresInSeconds: 300 // 5 minutes
    });
  } catch (err: any) {
    console.error('[Donation] Create donation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
