import { Router } from 'express';
import { signup, login } from '../controllers/authController';
import { upload } from '../middleware/upload';

const router = Router();
router.post('/signup', upload.single('avatar'), signup);
router.post('/login', login);

export default router;
