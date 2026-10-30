import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getGatewayConfigCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';
import { getAuthenticatedUser } from '@/server/auth';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';
    const streamerUsername = authUser?.username || '';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided. Please choose a PNG or JPG KHQR image.' },
        { status: 400 }
      );
    }

    // 1. Validate file size (max 2MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File size exceeds the 2MB limit (your file is ${sizeMb} MB). Please choose a file under 2MB.` },
        { status: 400 }
      );
    }

    // 2. Validate MIME type & file extension
    const mimeType = (file.type || '').toLowerCase();
    const originalName = file.name || 'khqr-payment.png';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported format. Please upload PNG or JPG image only.' },
        { status: 400 }
      );
    }

    // 3. Prepare target upload directory per client account
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment', streamerId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Clean up old file for this streamer if exists
    try {
      const gatewayCol = await getGatewayConfigCollection();
      const existingConfig = await gatewayCol.findOne({
        $or: [{ _id: `khqr_${streamerId}` }, { streamerId }]
      });
      if (existingConfig?.khqrImageUrl) {
        const oldPath = path.join(process.cwd(), 'public', existingConfig.khqrImageUrl.replace(/^\//, ''));
        await fs.unlink(oldPath).catch(() => {});
      }
    } catch (e) {}

    // 4. Generate unique stored filename scoped to this client account
    const safeExt = ext || (mimeType.includes('png') ? '.png' : '.jpg');
    const storedFilename = `khqr-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, storedFilename);

    // 5. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/payment/${streamerId}/${storedFilename}`;

    // 6. Update MongoDB gateway_settings for this specific client with persistent base64 backup
    const gatewayCol = await getGatewayConfigCollection();
    await gatewayCol.updateOne(
      { _id: `khqr_${streamerId}` },
      {
        $set: {
          streamerId,
          streamerUsername,
          khqrImageUrl: publicUrl,
          khqrFilename: originalName,
          khqrFileSize: file.size,
          khqrMimeType: mimeType || 'image/png',
          khqrBase64: base64Data,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // 7. Safe SQLite update
    try {
      db.prepare(`
        INSERT INTO payment_settings (streamer_id, master_khqr_image)
        VALUES (?, ?)
        ON CONFLICT(streamer_id) DO UPDATE SET
          master_khqr_image = excluded.master_khqr_image
      `).run(streamerId, publicUrl);
    } catch (e) {
      console.warn('[upload-khqr POST] SQLite update error:', e);
    }

    console.log(`✅ [Payment Gateway] Master KHQR image uploaded for client [${streamerId}]: ${publicUrl} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      message: 'Official Master KHQR payment image uploaded successfully for your account!',
      khqrImageUrl: publicUrl,
      filename: originalName,
      fileSize: file.size,
      streamerId
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/upload-khqr POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload KHQR payment image' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';
    const streamerUsername = authUser?.username || '';

    const gatewayCol = await getGatewayConfigCollection();
    const config = await gatewayCol.findOne({
      $or: [{ _id: `khqr_${streamerId}` }, { streamerId }]
    });

    if (config?.khqrImageUrl) {
      try {
        const filePath = path.join(process.cwd(), 'public', config.khqrImageUrl.replace(/^\//, ''));
        await fs.unlink(filePath).catch(() => {});
      } catch (e) {}
    }

    await gatewayCol.updateMany(
      {
        $or: [
          { _id: `khqr_${streamerId}` },
          { streamerId },
          { _id: 'master_khqr_config' }
        ]
      },
      {
        $set: {
          khqrImageUrl: '',
          khqrFilename: '',
          khqrFileSize: 0,
          khqrMimeType: '',
          khqrBase64: '',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    try {
      db.prepare(`
        UPDATE payment_settings
        SET master_khqr_image = ''
        WHERE streamer_id = ?
      `).run(streamerId);
    } catch (e) {
      console.warn('[upload-khqr DELETE] SQLite update error:', e);
    }

    // Clean up demo-streamer-id-1001 if removing for demo or admin
    try {
      if (streamerId === 'demo-streamer-id-1001') {
        db.prepare(`
          UPDATE payment_settings
          SET master_khqr_image = ''
        `).run();
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Master KHQR payment image removed from your account.'
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/upload-khqr DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to remove KHQR image' },
      { status: 500 }
    );
  }
}
