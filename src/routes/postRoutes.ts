import { Router } from 'express';
import { param, body } from 'express-validator';
import { auth } from '../middleware/auth';
import { createPost, getFeed, getUserPosts } from '../controllers/postController';
import { upload } from '../middleware/upload';

const router = Router();

// Feed route public hai, isme validation ki zaroorat nahi hai.
router.get('/feed', getFeed);

// User posts route par validation lagaya gaya hai taaki ID valid ho.
router.get(
  '/user/:id',
  [
    param('id', 'Invalid user ID').isMongoId()
  ],
  getUserPosts
);

// Create post route par body content ke liye validation lagaya gaya hai.
router.post(
  '/',
  auth,
  upload.array('images', 4),
  [
    body('content', 'Post content cannot be empty').not().isEmpty().trim().escape(),
    // Aap yahan aur bhi fields jaise 'title' etc. add kar sakte hain.
  ],
  createPost
);

export default router;
