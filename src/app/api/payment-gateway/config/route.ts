import { NextRequest, NextResponse } from 'next/server';
import { getGatewayConfigCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const gatewayCol = await getGatewayConfigCollection();
    let config = await gatewayCol.findOne({ _id: 'master_khqr_config' });

    if (!config) {
      config = {
        _id: 'master_khqr_config',
        khqrImageUrl: '',
        khqrFilename: '',
        khqrFileSize: 0,
        khqrMimeType: '',
        bankAccountName: 'STREAMBOTKH OFFICIAL KHQR',
        bakongAccountId: 'streambotkh@abaa',
        uploadedBy: 'admin',
        updatedAt: new Date()
      };
      await gatewayCol.insertOne(config);
    }

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
