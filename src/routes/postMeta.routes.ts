import { Router } from "express";
import multer from "multer";
import {
  createPostMeta,
  updatePostMeta,
  deletePostMeta,
  getPostMetaFeed,
  getUserPostMetas,
  getPostMetaById,
  likePostMeta,        // ✅ New controller
  unlikePostMeta,      // ✅ New controller
  savePostMeta,        // ✅ New controller
  unsavePostMeta       // ✅ New controller
} from "../controllers/postMetaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";

const router = Router();

// Multer setup for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
});

// ---------------- ROUTES ----------------

// Create PostMeta (Admin + Moderator + User)
router.post(
  "/",
  auth,
  authorize(["admin", "moderator", "user"]),
  upload.array("files", 10),
  createPostMeta
);

// Update PostMeta (Admin + Moderator + Owner) — block if restricted
router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true),
  filterRestricted("postMeta"),
  upload.array("files", 10),
  updatePostMeta
);

// Delete PostMeta (Admin + Owner) — block if restricted
router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true),
  filterRestricted("postMeta"),
  deletePostMeta
);

// ---------------- LIKE ROUTES ----------------
router.post(
  "/:id/like",
  auth,
  likePostMeta
);

router.delete(
  "/:id/like",
  auth,
  unlikePostMeta
);

// ---------------- SAVE ROUTES ----------------
router.post(
  "/:id/save",
  auth,
  savePostMeta
);

router.delete(
  "/:id/save",
  auth,
  unsavePostMeta
);

// ---------------- GET ROUTES ----------------

// Get PostMeta feed (Public)
router.get("/feed", getPostMetaFeed);

// Get all PostMeta by a specific user (Public)
router.get("/user/:id", getUserPostMetas);

// Get single PostMeta by ID (Public) — block if restricted
router.get("/:id", filterRestricted("postMeta"), getPostMetaById);

export default router;
