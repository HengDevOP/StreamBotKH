import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getGatewayConfigCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided. Please choose a PNG or JPG KHQR image.' },
        { status: 400 }
      );
    }

    // 1. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File size exceeds the 5MB limit (your file is ${sizeMb} MB). Please choose a file under 5MB.` },
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

    // 3. Prepare target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment');
    await fs.mkdir(uploadDir, { recursive: true });

    // 4. Generate unique stored filename
    const safeExt = ext || (mimeType.includes('png') ? '.png' : '.jpg');
    const storedFilename = `khqr-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, storedFilename);

    // 5. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/payment/${storedFilename}`;

    // 6. Update MongoDB gateway_settings
    const gatewayCol = await getGatewayConfigCollection();
    await gatewayCol.updateOne(
      { _id: 'master_khqr_config' },
      {
        $set: {
          khqrImageUrl: publicUrl,
          khqrFilename: originalName,
          khqrFileSize: file.size,
          khqrMimeType: mimeType || 'image/png',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // 7. Safe SQLite migration & update
    try {
      db.exec('ALTER TABLE payment_settings ADD COLUMN master_khqr_image TEXT');
    } catch (e) {}

    try {
      db.prepare(`
        UPDATE payment_settings SET master_khqr_image = ?
      `).run(publicUrl);
    } catch (e) {}

    console.log(`✅ [Payment Gateway] Master KHQR image uploaded: ${publicUrl} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      message: 'Official KHQR payment image uploaded successfully and active on all client donation pages!',
      khqrImageUrl: publicUrl,
      filename: originalName,
      fileSize: file.size
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
    const gatewayCol = await getGatewayConfigCollection();
    const config = await gatewayCol.findOne({ _id: 'master_khqr_config' });

    if (config?.khqrImageUrl) {
      try {
        const filename = path.basename(config.khqrImageUrl);
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'payment', filename);
        await fs.unlink(filePath);
      } catch (e) {}
    }

    await gatewayCol.updateOne(
      { _id: 'master_khqr_config' },
      {
        $set: {
          khqrImageUrl: '',
          khqrFilename: '',
          khqrFileSize: 0,
          khqrMimeType: '',
          updatedAt: new Date()
        }
      }
    );

    try {
      db.prepare('UPDATE payment_settings SET master_khqr_image = NULL').run();
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Custom KHQR payment image removed. Default dynamic QR fallback restored.'
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/upload-khqr DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to remove KHQR image' },
      { status: 500 }
    );
  }
}
