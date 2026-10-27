import dotenv from 'dotenv';
dotenv.config();

import { telegramGroupListener } from './telegram/telegramListener';
import { telegramUserManager } from './telegram/telegramUserClient';
import { PhraseCatcher } from './telegram/phraseCatcher';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function bootstrap() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ [StreamBotKH Backend Engine] Initializing...');
  console.log('⚡ [StreamBotKH Backend] Telegram Group Listener Active');
  console.log('⚡ [StreamBotKH Backend] TelegramJS User Client Engine Active');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (TELEGRAM_TOKEN) {
    console.log('[Backend] Connecting Telegram Bot to group...');
    const res = await telegramGroupListener.start(TELEGRAM_TOKEN);
    console.log('[Backend] Listener status:', res.message);
  } else {
    console.log('[Backend] TELEGRAM_BOT_TOKEN not provided in .env yet.');
    console.log('[Backend] TelegramJS phone connection (+855...) is ready via Dashboard.');
  }
}

// Export modules for programmatic usage
export { telegramGroupListener, telegramUserManager, PhraseCatcher };

if (require.main === module) {
  bootstrap();
}
