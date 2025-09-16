import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
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
import { createNotification } from "../utils/createNotification";
import { Post } from "../models/Post";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Minimal shape for lean() projection
type PostOwner = { user: mongoose.Types.ObjectId };

// Multer setup (for file uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// ---------------- CREATE / UPDATE / DELETE ----------------
router.post(
  "/",
  auth,
  authorize(["admin", "moderator", "user"]),
  upload.array("images", 10),
  createPost
);

router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true),
  filterRestricted("post"),
  upload.array("images", 10),
  updatePost
);

router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true),
  filterRestricted("post"),
  deletePost
);

// ---------------- LIKE ROUTES ----------------
router.post("/:id/like", auth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await likePost(req, res);

    const post = await Post.findById(req.params.id)
      .select("user")
      .lean<PostOwner>();

    if (post && req.user.id !== post.user.toString()) {
      await createNotification({
        userId: post.user,
        type: "like",
        message: `${req.user.username} liked your post`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/like", auth, unlikePost);

// ---------------- SAVE ROUTES ----------------
router.post("/:id/save", auth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await savePost(req, res);

    const post = await Post.findById(req.params.id)
      .select("user")
      .lean<PostOwner>();

    if (post && req.user.id !== post.user.toString()) {
      await createNotification({
        userId: post.user,
        type: "save",
        message: `${req.user.username} saved your post`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/save", auth, unsavePost);

// ---------------- REPORT ROUTE (Direct Telegram + Notification) ----------------
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

    const post = await Post.findById(postId)
      .select("user")
      .lean<PostOwner>();

    if (post) {
      await createNotification({
        userId: post.user,
        type: "report",
        message: `Your post was reported by ${req.user.username}`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(postId)
      });
    }

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
