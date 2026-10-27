import { Router } from 'express';
import { googleLogin, demoLogin, getMe } from '../controllers/authController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

router.post('/google', googleLogin);
router.post('/demo', demoLogin);
router.get('/me', requireAuth, getMe);

export default router;
