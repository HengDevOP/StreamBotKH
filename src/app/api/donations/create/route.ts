import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { getTemporaryDonationsCollection, getGatewayConfigCollection } from '@/server/database/mongo';

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

    // Use the official Payment Gateway KHQR image instead of generating dynamic QR code
    let khqrImage = '/uploads/payment/khqr-1793011590730-7bad271c.jpg';
    try {
      const gatewayCol = await getGatewayConfigCollection();
      const config = await gatewayCol.findOne({ _id: 'master_khqr_config' });
      if (config?.khqrImageUrl) {
        khqrImage = config.khqrImageUrl;
      }
    } catch (gatewayErr) {
      console.warn('[Donation] Could not fetch gateway KHQR image:', gatewayErr);
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
      streamerId,
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

    // 2. Store in temporary listener database queue (SQLite)
    try {
      db.prepare(`
        INSERT INTO temporary_donations (
          id, streamer_id, donor_name, donor_message, amount, currency,
          banking_name, video_url, video_title, video_start_time, video_end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        donationId,
        streamerId,
        donorName.slice(0, 50),
        (donorMessage || '').slice(0, 250),
        numAmount,
        validCurrency,
        cleanBankingName,
        cleanVideoUrl,
        cleanVideoTitle,
        cleanVideoStartTime,
        cleanVideoEndTime
      );
    } catch (tempErr) {
      console.warn('[Donation] Could not insert temporary SQLite record:', tempErr);
    }

    // 3. Store in temporary listener collection in MongoDB
    try {
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.insertOne({
        id: donationId,
        streamerId,
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
