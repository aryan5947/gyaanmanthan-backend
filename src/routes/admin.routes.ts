import express from 'express';
import { auth } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = express.Router();

// Example: Admin-only route
router.get('/dashboard', auth, authorize('admin'), (req, res) => {
  res.json({
    message: `Welcome ${req.user?.name}, you have admin access.`,
    role: req.user?.role
  });
});

// Example: Admin + Moderator route
router.post('/create-post', auth, authorize('admin', 'moderator'), (req, res) => {
  // Your post creation logic here
  res.json({ message: 'Post created successfully' });
});

export default router;
