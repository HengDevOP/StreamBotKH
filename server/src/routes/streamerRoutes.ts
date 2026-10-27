import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  getDashboardStats,
  getAlertSettings,
  updateAlertSettings,
  getPaymentSettings,
  updatePaymentSettings,
  regenerateOverlayToken,
  triggerTestAlert
} from '../controllers/streamerController';

const router = Router();

// All streamer routes require authentication
router.use(requireAuth);

router.get('/dashboard', getDashboardStats);
router.get('/alerts', getAlertSettings);
router.put('/alerts', updateAlertSettings);
router.get('/payments', getPaymentSettings);
router.put('/payments', updatePaymentSettings);
router.post('/token/regenerate', regenerateOverlayToken);
router.post('/alerts/test', triggerTestAlert);

export default router;
