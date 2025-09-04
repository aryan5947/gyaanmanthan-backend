import { Router } from "express";
import {
  addComment,
  addReply,
  toggleLikeComment, // ✅ rename match with controller
  editComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/commentController";
import { auth } from "../middleware/auth";

const router = Router();

// ---------------- COMMENTS ----------------
router.post("/:postId", auth, addComment);
router.get("/:postId", getCommentsByPost);
router.put("/:commentId", auth, editComment);
router.delete("/:commentId", auth, deleteComment);
router.post("/:commentId/like", auth, toggleLikeComment); // ✅ toggle like

// ---------------- REPLIES ----------------
router.post("/:commentId/reply", auth, addReply);

export default router;
