import { Router } from 'express';
import { auth } from '../middleware/auth';
import { logClick, logConversion } from '../controllers/affiliateController';

const router = Router();
router.post('/click', auth, logClick);
router.post('/conversion', logConversion); // often called from external webhook

export default router;
