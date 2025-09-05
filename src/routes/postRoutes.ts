import { Router } from 'express';
import { auth } from '../middleware/auth';
import { createPost, getFeed, getUserPosts } from '../controllers/postController';
import { upload } from '../middleware/upload';

const router = Router();
router.get('/feed', getFeed);
router.get('/user/:id', getUserPosts);
router.post('/', auth, upload.array('images', 4), createPost);

export default router;
