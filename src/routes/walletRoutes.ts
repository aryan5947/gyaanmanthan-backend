import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getWallet, tipCreator } from '../controllers/walletController';

const router = Router();
router.get('/', auth, getWallet);
router.post('/tip', auth, tipCreator);

export default router;
