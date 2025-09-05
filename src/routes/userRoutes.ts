import { Router } from 'express';
import { param, body } from 'express-validator';
import { auth } from '../middleware/auth';
import { getMe, getProfile, updateProfile } from '../controllers/userController';
import { upload } from '../middleware/upload';

const router = Router();

// /me route ko authentication ki zaroorat hai, jo pehle se hai. Isme validation ki zaroorat nahi hai.
router.get('/me', auth, getMe);

// /:id route par validation lagaya gaya hai taaki yeh ek valid MongoDB ObjectId ho.
// Isse aapke controller mein invalid ID se hone waale errors se bacha ja sakta hai.
router.get(
  '/:id',
  [
    param('id', 'Invalid user ID').isMongoId()
  ],
  getProfile
);

// Update profile route par validation lagaya gaya hai.
// Yeh optional hai taaki user sirf wahi cheez update kare jo woh chahta hai.
router.put(
  '/',
  auth,
  upload.single('avatar'),
  [
    body('name').optional().not().isEmpty().withMessage('Name cannot be empty').trim().escape(),
    body('bio').optional().isLength({ max: 200 }).withMessage('Bio cannot be more than 200 characters').trim().escape(),
    // Yahan aap aur bhi fields (jaise username, website, etc.) add kar sakte hain.
  ],
  updateProfile
);

export default router;
