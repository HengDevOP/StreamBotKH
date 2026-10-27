import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  CLIENT_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'streamneon_default_secret_key',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  // ABA PayWay — API URLs only (no merchant credentials; each Pro streamer sets their own via dashboard)
  ABA_PAYWAY_API_URL: 'https://checkout.payway.com.kh/api/payment-gateway/v1/payments/purchase',
  ABA_PAYWAY_CHECK_TRAN_URL: 'https://checkout.payway.com.kh/api/payment-gateway/v1/payments/check-transaction',

  // Database Config
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamneon',

  // Telegram Bot & MTProto Config
  TELEGRAM_API_ID: process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32427800,
  TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH || '8f8e70605256a4e08a81bd5e45481ceb',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'StreamNeonAlertBot'
};
