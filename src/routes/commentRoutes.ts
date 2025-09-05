import { Router } from "express";
import { param, body } from "express-validator";
import {
  addComment,
  addReply,
  toggleLikeComment,
  toggleLikeReply,
  editComment,
  deleteComment,
  editReply,
  deleteReply,
  getCommentsByPost,
} from "../controllers/commentController";
import { auth } from "../middleware/auth";

const router = Router();

// ---------------- COMMENTS ----------------

// Add a new comment to a post
router.post(
  "/:postId",
  auth,
  [
    param("postId", "Invalid post ID").isMongoId(),
    body("content", "Comment content cannot be empty").not().isEmpty().trim().escape(),
  ],
  addComment
);

// Get all comments for a post
router.get(
  "/:postId",
  [
    param("postId", "Invalid post ID").isMongoId()
  ],
  getCommentsByPost
);

// Edit a comment
router.put(
  "/:commentId",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId(),
    body("content", "Comment content cannot be empty").not().isEmpty().trim().escape(),
  ],
  editComment
);

// Delete a comment
router.delete(
  "/:commentId",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId()
  ],
  deleteComment
);

// Toggle like on a comment
router.post(
  "/:commentId/like",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId()
  ],
  toggleLikeComment
);

// ---------------- REPLIES ----------------

// Add a reply to a comment
router.post(
  "/:commentId/reply",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId(),
    body("content", "Reply content cannot be empty").not().isEmpty().trim().escape(),
  ],
  addReply
);

// Edit a reply
router.put(
  "/:commentId/reply/:replyId",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId(),
    param("replyId", "Invalid reply ID").isMongoId(),
    body("content", "Reply content cannot be empty").not().isEmpty().trim().escape(),
  ],
  editReply
);

// Delete a reply
router.delete(
  "/:commentId/reply/:replyId",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId(),
    param("replyId", "Invalid reply ID").isMongoId(),
  ],
  deleteReply
);

// Toggle like on a reply
router.post(
  "/:commentId/reply/:replyId/like",
  auth,
  [
    param("commentId", "Invalid comment ID").isMongoId(),
    param("replyId", "Invalid reply ID").isMongoId(),
  ],
  toggleLikeReply
);

export default router;
