import { Router } from 'express';
import { getPublicStreamer, createDonation, getDonationStatus, getStreamerRecentDonations } from '../controllers/donationController';

const router = Router();

// Public routes for donors
router.get('/streamer/:username', getPublicStreamer);
router.get('/streamer/:username/recent', getStreamerRecentDonations);
router.post('/create', createDonation);
router.get('/:id/status', getDonationStatus);

export default router;
