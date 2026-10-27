import { getGatewayConfigCollection } from '../database/mongo';
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

  // Use the official Payment Gateway image uploaded by the streamer/admin instead of generating synthetic dynamic QR
  let gatewayImage = '/uploads/payment/khqr-1793011590730-7bad271c.jpg';
  try {
    const gatewayCol = await getGatewayConfigCollection();
    const config = await gatewayCol.findOne({ _id: 'master_khqr_config' });
    if (config?.khqrImageUrl) {
      gatewayImage = config.khqrImageUrl;
    }
  } catch (e) {
    console.warn('[Bakong Service] Could not fetch gateway image from MongoDB:', e);
  }

  return {
    qrString: gatewayImage,
    qrImage: gatewayImage,
    abaDeepLink: '',
    bakongDeepLink: ''
  };
}
