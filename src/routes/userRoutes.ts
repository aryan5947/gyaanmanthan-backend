import { Router } from 'express';
import { param, body } from 'express-validator';
import { auth } from '../middleware/auth';
import { getMe, getProfile, updateProfile } from '../controllers/userController';
import { upload } from '../middleware/upload';

const router = Router();

// ✅ Get current logged-in user
router.get('/me', auth, getMe);

// ✅ Get profile by ID (with follow flags)
router.get(
  '/:id',
  auth,
  [param('id', 'Invalid user ID').isMongoId()],
  getProfile
);

// ✅ Update profile
router.put(
  '/',
  auth,
  upload.single('avatar'),
  [
    body('name').optional().not().isEmpty().withMessage('Name cannot be empty').trim().escape(),
    body('bio').optional().isLength({ max: 200 }).withMessage('Bio cannot be more than 200 characters').trim().escape(),
  ],
  updateProfile
);

export default router;
