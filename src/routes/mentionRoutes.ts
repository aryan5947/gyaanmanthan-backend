import { Router } from "express";
import { auth } from "../middleware/auth.js";              // ✅ .js extension
import { requireUser } from "../utils/requireUser.js";     // ✅ .js extension
import {
  acceptMention,
  rejectMention,
  getAcceptedMentions
} from "../controllers/mentionController.js";             // ✅ .js extension

const router = Router();

// ✅ Accept a mention
router.patch("/:id/accept", auth, requireUser, acceptMention);

// ✅ Reject a mention
router.patch("/:id/reject", auth, requireUser, rejectMention);

// ✅ Get accepted mentions for a user profile
router.get("/user/:userId", getAcceptedMentions);

export default router;
