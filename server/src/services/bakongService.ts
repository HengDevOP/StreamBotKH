import QRCode from 'qrcode';
import { generateKHQRString, generateABAMobileDeepLink, generateBakongDeepLink, KHQROptions } from '../utils/khqr';
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
  qrImage: string; // Base64 Data URL
  abaDeepLink: string;
  bakongDeepLink: string;
}

export async function createBakongDonationQR(params: CreateDonationQRParams): Promise<DonationQRResult> {
  const { donationId, streamerId, amount, currency, donorName } = params;

  // Fetch streamer payment settings
  const paymentSettings = db.prepare(`
    SELECT bakong_account_id, bakong_account_name, is_sandbox
    FROM payment_settings
    WHERE streamer_id = ?
  `).get(streamerId) as { bakong_account_id: string; bakong_account_name: string; is_sandbox: number } | undefined;

  const bakongAccountId = paymentSettings?.bakong_account_id || 'streamneon@abaa';
  const merchantName = paymentSettings?.bakong_account_name || 'STREAMNEON VIP';

  const khqrOptions: KHQROptions = {
    bakongAccountId,
    merchantName,
    merchantCity: 'Phnom Penh',
    amount,
    currency,
    billNumber: donationId.slice(0, 15).toUpperCase(),
    referenceId: donationId.slice(0, 15).toUpperCase(),
    terminalLabel: 'StreamNeon'
  };

  const qrString = generateKHQRString(khqrOptions);

  // Generate Base64 QR code image with high visual fidelity and neon accent
  const qrImage = await QRCode.toDataURL(qrString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 380,
    color: {
      dark: '#0B0F19',
      light: '#FFFFFF'
    }
  });

  const abaDeepLink = generateABAMobileDeepLink(qrString);
  const bakongDeepLink = generateBakongDeepLink(qrString);

  return {
    qrString,
    qrImage,
    abaDeepLink,
    bakongDeepLink
  };
}
