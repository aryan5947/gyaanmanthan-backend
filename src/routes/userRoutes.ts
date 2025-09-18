import { Router } from 'express';
import { param, body } from 'express-validator';
import { auth } from '../middleware/auth';
import { connectTelegramTest } from "../controllers/connectTelegramTest";
import { upload } from '../middleware/upload';
import {
  getMeWithFullProfile,
  getProfileWithFullProfile,
  updateProfile,
  deleteProfile
} from '../controllers/userController';

const router = Router();

/**
 * @route   GET /users/me
 * @desc    Get current logged-in user's full profile
 * @access  Private
 */
router.get('/me', auth, getMeWithFullProfile);

/**
 * @route   GET /users/connect-telegram-test
 * @desc    Generate Telegram bot deep link for account linking (test)
 * @access  Private
 */
router.get("/connect-telegram-test", auth, connectTelegramTest);

/**
 * @route   GET /users/:id
 * @desc    Get any user's full profile by ID
 * @access  Private
 */
router.get(
  '/:id',
  auth,
  [param('id', 'Invalid user ID').isMongoId()],
  getProfileWithFullProfile
);

/**
 * @route   PUT /users
 * @desc    Update logged-in user's profile
 * @access  Private
 */
router.put(
  '/',
  auth,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  [
    body('name')
      .optional()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .trim()
      .escape(),
    body('bio')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Bio cannot be more than 200 characters')
      .trim()
      .escape(),
    body('phone').optional().trim().escape(),
    body('dob').optional().trim().escape(),
    body('gender').optional().trim().escape(),
    body('website').optional().trim(),
    body('location').optional().trim().escape()
  ],
  updateProfile
);

/**
 * @route   DELETE /users
 * @desc    Delete logged-in user's profile and all related data
 * @access  Private
 */
router.delete('/', auth, deleteProfile);

export default router;
