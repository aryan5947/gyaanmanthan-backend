import { Router } from "express";
import {
  addMetaComment,
  addMetaReply,
  toggleLikeMetaComment,
  toggleLikeMetaReply,
  editMetaComment,
  deleteMetaComment,
  editMetaReply,
  deleteMetaReply,
  getCommentsByPostMeta,
} from "../controllers/postMetaCommentController";
import { auth } from "../middleware/auth";

const router = Router();

// ---------------- COMMENTS ----------------
router.post("/:postMetaId", auth, addMetaComment);
router.get("/:postMetaId", getCommentsByPostMeta);
router.put("/:commentId", auth, editMetaComment);
router.delete("/:commentId", auth, deleteMetaComment);
router.post("/:commentId/like", auth, toggleLikeMetaComment);

// ---------------- REPLIES ----------------
router.post("/:commentId/reply", auth, addMetaReply);
router.put("/:commentId/reply/:replyId", auth, editMetaReply);
router.delete("/:commentId/reply/:replyId", auth, deleteMetaReply);
router.post("/:commentId/reply/:replyId/like", auth, toggleLikeMetaReply);

export default router;
