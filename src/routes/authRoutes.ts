// routes/auth.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { signup, login } from '../controllers/authController';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * ✅ Signup route
 * - Accepts avatar + banner uploads
 * - Validates name, email, password
 * - Uses multer.fields for easy future extension
 */
router.post(
  '/signup',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  [
    body('name', 'Name is required')
      .not()
      .isEmpty()
      .trim()
      .escape(),
    body('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail(),
    body('password', 'Password must be 6 or more characters')
      .isLength({ min: 6 }),
  ],
  signup
);

/**
 * ✅ Login route
 * - Validates email & password
 */
router.post(
  '/login',
  [
    body('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail(),
    body('password', 'Password cannot be blank')
      .not()
      .isEmpty(),
  ],
  login
);

export default router;
