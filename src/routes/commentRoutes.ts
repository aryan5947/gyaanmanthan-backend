import { Router } from "express";
import {
  addComment,
  addReply,
  toggleLikeComment,   // ✅ toggle like for comment
  toggleLikeReply,     // ✅ toggle like for reply
  editComment,
  deleteComment,
  editReply,           // ✅ new
  deleteReply,         // ✅ new
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
router.put("/:commentId/reply/:replyId", auth, editReply); // ✅ edit reply
router.delete("/:commentId/reply/:replyId", auth, deleteReply); // ✅ delete reply
router.post("/:commentId/reply/:replyId/like", auth, toggleLikeReply); // ✅ toggle like reply

export default router;
