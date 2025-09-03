import { Router } from "express";
import {
  addComment,
  addReply,
  likeComment,
  editComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/commentController";
import { auth } from "../middleware/auth"; // jo tumne banaya hai

const router = Router();

// Comments
router.post("/:postId", auth, addComment);
router.get("/:postId", getCommentsByPost);
router.put("/:commentId", auth, editComment);
router.delete("/:commentId", auth, deleteComment);
router.post("/:commentId/like", auth, likeComment);

// Replies
router.post("/:commentId/reply", auth, addReply);

export default router;
