import { getGatewayConfigCollection, getPaymentSettingsCollection, restoreMasterKhqrImage } from '../database/mongo';

export interface CreateDonationQRParams {
  donationId: string;
  streamerId: string;
  amount: number;
  currency: 'USD' | 'KHR';
  donorName: string;
}

export interface DonationQRResult {
  qrString: string;
  qrImage: string;
  abaDeepLink: string;
  bakongDeepLink: string;
}

export async function createBakongDonationQR(params: CreateDonationQRParams): Promise<DonationQRResult> {
  const { donationId, streamerId, amount, currency, donorName } = params;

  // Use the official Payment Gateway Master KHQR image uploaded by the streamer (verified & restored in MongoDB)
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
        const paymentSettingsCol = await getPaymentSettingsCollection();
        const mongoSettings = await paymentSettingsCol.findOne({
          $or: [{ streamerId }, { _id: streamerId as any }]
        });
        const mSettings = mongoSettings as any;
        if (mSettings?.khqrImageUrl || mSettings?.masterKhqrImage) {
          gatewayImage = mSettings.khqrImageUrl || mSettings.masterKhqrImage;
        }
      }
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
