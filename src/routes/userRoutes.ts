import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getMe, getProfile, updateProfile } from '../controllers/userController';
import { upload } from '../middleware/upload';

const router = Router();
router.get('/me', auth, getMe);
router.get('/:id', getProfile);
router.put('/', auth, upload.single('avatar'), updateProfile);

export default router;
