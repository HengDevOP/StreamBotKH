/**
 * EMVCo KHQR generator for Bakong & ABA Bank transactions
 */

export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    for (let bit = 0; bit < 8; bit++) {
      const bitFlag = (crc >> 15) & 1;
      const dataBit = (byte >> (7 - bit)) & 1;
      crc = (crc << 1) & 0xffff;
      if (bitFlag ^ dataBit) {
        crc = (crc ^ polynomial) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export interface KHQROptions {
  bakongAccountId: string; // e.g. "streamneon@abaa" or "85512345678@abaa"
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  currency?: 'USD' | 'KHR';
  billNumber?: string;
  referenceId?: string;
  terminalLabel?: string;
}

export function generateKHQRString(options: KHQROptions): string {
  const {
    bakongAccountId,
    merchantName = 'STREAMNEON VIP',
    merchantCity = 'Phnom Penh',
    amount,
    currency = 'USD',
    billNumber,
    referenceId,
    terminalLabel = 'StreamNeon'
  } = options;

  let payload = '';

  // 00: Payload Format Indicator
  payload += formatTLV('00', '01');

  // 01: Point of Initiation Method (12 = dynamic with amount, 11 = static)
  payload += formatTLV('01', amount && amount > 0 ? '12' : '11');

  // 29 or 30: Merchant Account Information
  // Tag 29 for Bakong Individual/Merchant account
  // Sub-tag 00: Bakong account identifier
  const merchantInfo = formatTLV('00', bakongAccountId);
  payload += formatTLV('29', merchantInfo);

  // 52: Merchant Category Code
  payload += formatTLV('52', '5999');

  // 53: Transaction Currency (840 = USD, 116 = KHR)
  const currencyCode = currency === 'KHR' ? '116' : '840';
  payload += formatTLV('53', currencyCode);

  // 54: Transaction Amount
  if (amount && amount > 0) {
    const formattedAmount = currency === 'KHR' ? Math.round(amount).toString() : amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // 58: Country Code
  payload += formatTLV('58', 'KH');

  // 59: Merchant Name
  const cleanName = merchantName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25) || 'STREAMNEON';
  payload += formatTLV('59', cleanName);

  // 60: Merchant City
  payload += formatTLV('60', merchantCity.slice(0, 15));

  // 62: Additional Data Field Template
  let additionalData = '';
  if (billNumber) {
    additionalData += formatTLV('01', billNumber.slice(0, 25));
  }
  if (referenceId) {
    additionalData += formatTLV('05', referenceId.slice(0, 25));
  }
  if (terminalLabel) {
    additionalData += formatTLV('07', terminalLabel.slice(0, 25));
  }
  if (additionalData) {
    payload += formatTLV('62', additionalData);
  }

  // 63: CRC16 Checksum placeholder
  const rawDataForCRC = payload + '6304';
  const checksum = calculateCRC16(rawDataForCRC);

  return `${rawDataForCRC}${checksum}`;
}

export function generateABAMobileDeepLink(khqrString: string): string {
  return `aba://qr/${encodeURIComponent(khqrString)}`;
}

export function generateBakongDeepLink(khqrString: string): string {
  return `bakong://qr/${encodeURIComponent(khqrString)}`;
}
