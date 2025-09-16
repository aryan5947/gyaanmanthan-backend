import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import {
  createPostMeta,
  updatePostMeta,
  deletePostMeta,
  getPostMetaFeed,
  getUserPostMetas,
  getPostMetaById,
  likePostMeta,
  unlikePostMeta,
  savePostMeta,
  unsavePostMeta
} from "../controllers/postMetaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";
import { sendTelegramAlertWithButtons } from "../utils/telegramBot.js";
import { createNotification } from "../utils/createNotification";
import { PostMeta } from "../models/PostMeta";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Minimal shape for lean() projection
type PostMetaOwner = { user: mongoose.Types.ObjectId };

// Multer setup for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
});

// ---------------- CREATE / UPDATE / DELETE ----------------
router.post(
  "/",
  auth,
  authorize(["admin", "moderator", "user"]),
  upload.array("files", 10),
  createPostMeta
);

router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true),
  filterRestricted("postMeta"),
  upload.array("files", 10),
  updatePostMeta
);

router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true),
  filterRestricted("postMeta"),
  deletePostMeta
);

// ---------------- LIKE ROUTES ----------------
router.post("/:id/like", auth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await likePostMeta(req, res);

    const postMeta = await PostMeta.findById(req.params.id)
      .select("user")
      .lean<PostMetaOwner>();

    if (postMeta && req.user.id !== postMeta.user.toString()) {
      await createNotification({
        userId: postMeta.user, // already ObjectId
        type: "like",
        message: `${req.user.username} liked your postMeta`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/like", auth, unlikePostMeta);

// ---------------- SAVE ROUTES ----------------
router.post("/:id/save", auth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await savePostMeta(req, res);

    const postMeta = await PostMeta.findById(req.params.id)
      .select("user")
      .lean<PostMetaOwner>();

    if (postMeta && req.user.id !== postMeta.user.toString()) {
      await createNotification({
        userId: postMeta.user, // already ObjectId
        type: "save",
        message: `${req.user.username} saved your postMeta`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/save", auth, unsavePostMeta);

// ---------------- REPORT ROUTE (Direct Telegram + Notification) ----------------
router.post("/:postMetaId/report", auth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { postMetaId } = req.params;
  const { reason, details } = req.body;
  const reportedBy = req.user.id;
  const reportId = uuidv4();

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ ok: false, message: "Reason is required" });
  }

  try {
    await sendTelegramAlertWithButtons(
      "🚨 PostMeta Reported",
      `Report ID: ${reportId}
PostMeta ID: ${postMetaId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}`,
      [
        [{ text: "✅ ResolveMeta", callback_data: `resolveMeta_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postMetaId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    const postMeta = await PostMeta.findById(postMetaId)
      .select("user")
      .lean<PostMetaOwner>();

    if (postMeta) {
      await createNotification({
        userId: postMeta.user, // already ObjectId
        type: "report",
        message: `Your postMeta was reported by ${req.user.username}`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(postMetaId)
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
router.get("/feed", getPostMetaFeed);
router.get("/user/:id", getUserPostMetas);
router.get("/:id", filterRestricted("postMeta"), getPostMetaById);

export default router;
