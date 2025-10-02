import { Router, Request, Response, NextFunction } from 'express';
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

// 🆕 Models for summary
import { User } from "../models/User";
import { Follow } from "../models/Follow";
import { PostLike } from "../models/PostLike";
import { Like } from "../models/LikePostMeta";
import { SavedPost } from "../models/SavedPost";
import { SavedPostMeta } from "../models/SavedPostMeta";

const router = Router();

/**
 * Small middleware to ensure req.user is defined
 */
function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/**
 * @route   GET /user/me
 * @desc    Get current logged-in user's full profile
 * @access  Private
 */
router.get('/me', auth, requireUser, getMeWithFullProfile);

/**
 * @route   GET /user/summary
 * @desc    Get current user's profile + likes + saves + following in one payload
 * @access  Private
 */
router.get('/summary', auth, requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // ✅ safe after requireUser

    const [me, followers, following, postLikes, postMetaLikes, savedPosts, savedPostMetas] =
      await Promise.all([
        User.findById(userId).select("-passwordHash"),
        Follow.find({ following: userId }).select("follower createdAt"),
        Follow.find({ follower: userId }).select("following createdAt"),
        PostLike.find({ userId }).select("postId createdAt"),
        Like.find({ userId }).select("postMetaId createdAt"),
        SavedPost.find({ userId }).select("postId createdAt"),
        SavedPostMeta.find({ userId }).select("postMetaId createdAt"),
      ]);

    // 🆕 Always false for self-summary
    const canFollow = false;

    res.json({
      me: {
        ...me?.toObject?.() || me,
        canFollow, // 🆕 inject here
      },
      followers,
      following,
      likes: {
        posts: postLikes,
        postMeta: postMetaLikes,
      },
      saves: {
        posts: savedPosts,
        postMeta: savedPostMetas,
      },
    });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @route   GET /user/connect-telegram-test
 * @desc    Generate Telegram bot deep link for account linking (test)
 * @access  Private
 */
router.get("/connect-telegram-test", auth, requireUser, connectTelegramTest);

/**
 * @route   GET /user/:id
 * @desc    Get any user's full profile by ID
 * @access  Private
 */
router.get(
  '/:id',
  auth,
  requireUser,
  [param('id', 'Invalid user ID').isMongoId()],
  getProfileWithFullProfile
);

/**
 * @route   PUT /user
 * @desc    Update logged-in user's profile
 * @access  Private
 */
router.put(
  '/',
  auth,
  requireUser,
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
 * @route   DELETE /user
 * @desc    Delete logged-in user's profile and all related data
 * @access  Private
 */
router.delete('/', auth, requireUser, deleteProfile);

export default router;
