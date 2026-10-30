import { getGatewayConfigCollection, restoreMasterKhqrImage } from '../database/mongo';
import { db } from '../database/db';

export interface CreateDonationQRParams {
  donationId: string;
  streamerId: string;
  amount: number;
  currency: 'USD' | 'KHR';
  donorName: string;
}

export interface DonationQRResult {
  qrString: string;
  qrImage: string; // Payment gateway image URL or Base64 Data URL
  abaDeepLink: string;
  bakongDeepLink: string;
}

export async function createBakongDonationQR(params: CreateDonationQRParams): Promise<DonationQRResult> {
  const { donationId, streamerId, amount, currency, donorName } = params;

  // Use the official Payment Gateway Master KHQR image uploaded by the streamer (verified & restored)
  let gatewayImage = '';
  try {
    const restoreResult = await restoreMasterKhqrImage(streamerId);
    if (restoreResult.restored && restoreResult.khqrImageUrl) {
      gatewayImage = restoreResult.khqrImageUrl;
    } else {
      const gatewayCol = await getGatewayConfigCollection();
      const config = await gatewayCol.findOne({
        $or: [
          { _id: `khqr_${streamerId}` },
          { streamerId },
          { _id: 'master_khqr_config' }
        ]
      });
      if (config?.khqrImageUrl) {
        gatewayImage = config.khqrImageUrl;
      } else {
        const sqliteSettings = db.prepare('SELECT master_khqr_image FROM payment_settings WHERE streamer_id = ?').get(streamerId) as any;
        if (sqliteSettings?.master_khqr_image) {
          gatewayImage = sqliteSettings.master_khqr_image;
        }
      }
    }
  } catch (e) {
    console.warn('[Bakong Service] Could not fetch gateway image from database:', e);
  }

  return {
    qrString: gatewayImage,
    qrImage: gatewayImage,
    abaDeepLink: '',
    bakongDeepLink: ''
  };
}
