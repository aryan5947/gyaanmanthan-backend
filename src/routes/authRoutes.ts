import { Router } from 'express';
import { body } from 'express-validator';
import { signup, login } from '../controllers/authController';
import { upload } from '../middleware/upload';

const router = Router();

// Signup route par validation aur sanitization lagaya gaya hai.
router.post(
  '/signup',
  upload.single('avatar'), // File upload middleware
  [
    // Validation rules:
    body('name', 'Name is required').not().isEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  signup // Controller function
);

// Login route par bhi validation lagaya gaya hai.
router.post(
  '/login',
  [
    // Validation rules:
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password cannot be blank').not().isEmpty(),
  ],
  login // Controller function
);

export default router;
