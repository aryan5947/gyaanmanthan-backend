import { Router } from 'express';
import { auth } from '../middleware/auth';
import { listAds, createAd, clickAd } from '../controllers/adController';

const router = Router();
// In real life, protect create with admin auth
router.get('/', auth, listAds);
router.post('/', auth, createAd);
router.post('/:id/click', clickAd);

export default router;
