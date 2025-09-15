import { Router } from "express";
import multer from "multer";
import {
  createPost,
  updatePost,
  deletePost,
  getFeed,
  getUserPosts,
  getPostById,
  likePost,
  unlikePost,
  savePost,
  unsavePost
} from "../controllers/postController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";
import { sendTelegramAlertWithButtons } from "../utils/telegramBot.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Multer setup (for file uploads, Cloudinary integration will happen in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// ---------------- CREATE / UPDATE / DELETE ----------------

// Create Post (Admin + Moderator + User)
router.post(
  "/",
  auth,
  authorize(["admin", "moderator", "user"]),
  upload.array("images", 10),
  createPost
);

// Update Post (Admin + Moderator + Owner) — block if restricted
router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true),
  filterRestricted("post"),
  upload.array("images", 10),
  updatePost
);

// Delete Post (Admin + Owner) — block if restricted
router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true),
  filterRestricted("post"),
  deletePost
);

// ---------------- LIKE ROUTES ----------------
router.post("/:id/like", auth, likePost);
router.delete("/:id/like", auth, unlikePost);

// ---------------- SAVE ROUTES ----------------
router.post("/:id/save", auth, savePost);
router.delete("/:id/save", auth, unsavePost);

// ---------------- REPORT ROUTE (Direct Telegram) ----------------
router.post("/:postId/report", auth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { postId } = req.params;
  const { reason, details } = req.body;
  const reportedBy = req.user.id;
  const reportId = uuidv4();

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ ok: false, message: "Reason is required" });
  }

  try {
    await sendTelegramAlertWithButtons(
      "🚨 Post Reported",
      `Report ID: ${reportId}
Post ID: ${postId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}`,
      [
        [{ text: "✅ Resolve", callback_data: `resolve_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Report submitted successfully",
      reportId
    });
  } catch (err: any) {
    console.error("Telegram send failed:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to send Telegram alert"
    });
  }
});

// ---------------- GET ROUTES ----------------
router.get("/feed", getFeed);
router.get("/user/:id", getUserPosts);
router.get("/:id", filterRestricted("post"), getPostById);

export default router;
