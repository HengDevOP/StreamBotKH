import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getGatewayConfigCollection, getPaymentSettingsCollection } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to upload payment KHQR.' },
        { status: 401 }
      );
    }
    const streamerId = authUser.id;
    const streamerUsername = authUser.username || '';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isCustom =
      formData.get('type') === 'custom' ||
      formData.get('isCustom') === 'true' ||
      req.nextUrl.searchParams.get('type') === 'custom';

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
    const originalName = file.name || (isCustom ? 'custom-khqr.png' : 'khqr-payment.png');
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

    // Clean up old file for this streamer if exists (strictly enforce only 1 image)
    try {
      const gatewayCol = await getGatewayConfigCollection();
      const existingConfig = await gatewayCol.findOne({
        $or: [{ _id: `khqr_${streamerId}` }, { streamerId }]
      });
      const targetOldUrl = isCustom ? existingConfig?.customKhqrImageUrl : existingConfig?.khqrImageUrl;
      if (targetOldUrl) {
        const oldPath = path.join(process.cwd(), 'public', targetOldUrl.replace(/^\//, ''));
        await fs.unlink(oldPath).catch(() => {});
      }
    } catch (e) {}

    // 4. Generate unique stored filename scoped to this client account
    const safeExt = ext || (mimeType.includes('png') ? '.png' : '.jpg');
    const filePrefix = isCustom ? 'custom-khqr' : 'khqr';
    const storedFilename = `${filePrefix}-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, storedFilename);

    // 5. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/payment/${streamerId}/${storedFilename}`;

    // 6. Update MongoDB gateway_settings for this specific client with persistent base64 backup
    const gatewayCol = await getGatewayConfigCollection();
    if (isCustom) {
      await gatewayCol.updateOne(
        { _id: `khqr_${streamerId}` },
        {
          $set: {
            streamerId,
            streamerUsername,
            customKhqrImageUrl: publicUrl,
            customKhqrFilename: originalName,
            customKhqrFileSize: file.size,
            customKhqrMimeType: mimeType || 'image/png',
            customKhqrBase64: base64Data,
            customKhqrUpdatedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } else {
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
    }

    // 7. Update payment_settings in MongoDB
    try {
      const paymentCol = await getPaymentSettingsCollection();
      if (isCustom) {
        await paymentCol.updateOne(
          { streamerId },
          {
            $set: {
              customKhqrImageUrl: publicUrl,
              customKhqrFilename: originalName,
              customKhqrFileSize: file.size,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      } else {
        await paymentCol.updateOne(
          { streamerId },
          {
            $set: {
              masterKhqrImage: publicUrl,
              masterKhqrFilename: originalName,
              masterKhqrFileSize: file.size,
              masterKhqrMimeType: mimeType || 'image/png',
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    } catch (e) {
      console.warn('[upload-khqr POST] MongoDB payment settings update warning:', e);
    }

    console.log(`✅ [Payment Gateway] ${isCustom ? 'Custom' : 'Master'} KHQR image uploaded for client [${streamerId}]: ${publicUrl} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      message: isCustom
        ? 'Custom KHQR payment image uploaded successfully (used for "Custom" donation amount)!'
        : 'Official Master KHQR payment image uploaded successfully for your account!',
      customKhqrImageUrl: isCustom ? publicUrl : undefined,
      khqrImageUrl: isCustom ? undefined : publicUrl,
      imageUrl: publicUrl,
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
    const isCustom = req.nextUrl.searchParams.get('type') === 'custom';

    const gatewayCol = await getGatewayConfigCollection();
    const config = await gatewayCol.findOne({
      $or: [{ _id: `khqr_${streamerId}` }, { streamerId }]
    });

    if (isCustom) {
      if (config?.customKhqrImageUrl) {
        try {
          const filePath = path.join(process.cwd(), 'public', config.customKhqrImageUrl.replace(/^\//, ''));
          await fs.unlink(filePath).catch(() => {});
        } catch (e) {}
      }

      await gatewayCol.updateMany(
        {
          $or: [
            { _id: `khqr_${streamerId}` },
            { streamerId }
          ]
        },
        {
          $set: {
            customKhqrImageUrl: '',
            customKhqrFilename: '',
            customKhqrFileSize: 0,
            customKhqrMimeType: '',
            customKhqrBase64: '',
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      try {
        const paymentCol = await getPaymentSettingsCollection();
        await paymentCol.updateOne(
          { streamerId },
          {
            $set: {
              customKhqrImageUrl: '',
              customKhqrFilename: '',
              customKhqrFileSize: 0,
              updatedAt: new Date()
            }
          }
        );
      } catch (e) {
        console.warn('[upload-khqr DELETE] MongoDB payment settings update warning:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Custom KHQR payment image removed from your account.'
      });
    }

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
      const paymentCol = await getPaymentSettingsCollection();
      await paymentCol.updateOne(
        { streamerId },
        {
          $set: {
            masterKhqrImage: '',
            updatedAt: new Date()
          }
        }
      );
    } catch (e) {
      console.warn('[upload-khqr DELETE] MongoDB payment settings update warning:', e);
    }

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
