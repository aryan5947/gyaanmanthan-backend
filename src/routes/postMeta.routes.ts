import { Router } from "express";
import multer from "multer";
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
import { v4 as uuidv4 } from "uuid";

const router = Router();

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
router.post("/:id/like", auth, likePostMeta);
router.delete("/:id/like", auth, unlikePostMeta);

// ---------------- SAVE ROUTES ----------------
router.post("/:id/save", auth, savePostMeta);
router.delete("/:id/save", auth, unsavePostMeta);


// ---------------- REPORT ROUTE (Direct Telegram) ----------------
router.post("/:postMetaId/report", auth, async (req, res) => {
  // ✅ Runtime guard so TS knows user is defined
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { postMetaId } = req.params;
  const { reason, details } = req.body;
  const reportedBy = req.user.id;
  const reportId = uuidv4();

  // ✅ Validate reason
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

    return res.status(201).json({
      ok: true,
      message: "Report submitted successfully",
      reportId
    });
  } catch (err: any) { // ✅ err typed as any so .message works
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
