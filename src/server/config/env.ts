import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  CLIENT_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'streamneon_default_secret_key',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  // ABA PayWay Config
  ABA_PAYWAY_API_URL: process.env.ABA_PAYWAY_API_URL || 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
  ABA_PAYWAY_CHECK_TRAN_URL: process.env.ABA_PAYWAY_CHECK_TRAN_URL || 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction',
  ABA_PAYWAY_MERCHANT_ID: process.env.ABA_PAYWAY_MERCHANT_ID || 'ec439126',
  ABA_PAYWAY_API_KEY: process.env.ABA_PAYWAY_API_KEY || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
  ABA_PAYWAY_PUSHBACK_URL: process.env.ABA_PAYWAY_PUSHBACK_URL || 'http://localhost:3000/api/payway/webhook',

  // Telegram Bot Config
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'StreamNeonAlertBot'
};
