import { Router } from 'express';
import { paywayWebhook, simulatePayment, telegramWebhook } from '../controllers/paywayController';

const router = Router();

// ABA PayWay Pushback / Webhook
router.post('/webhook', paywayWebhook);

// Simulation endpoint for instant local & testing alerts
router.post('/simulate', simulatePayment);

// Telegram bot webhook
router.post('/telegram', telegramWebhook);

export default router;
