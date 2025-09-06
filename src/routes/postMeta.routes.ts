import { Router } from "express";
import multer from "multer";
import {
  createPostMeta,
  updatePostMeta,
  deletePostMeta,
  getPostMetaFeed,
  getUserPostMetas,
} from "../controllers/PostMetaController"; // ✅ Case match for Linux servers
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize"; // ✅ Role-based middleware

const router = Router();

// Multer setup for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // ✅ 5MB per file safety limit
});

// ---------------- ROUTES ----------------

// Create PostMeta (Admin + Moderator)
router.post(
  "/",
  auth,
  authorize("admin", "moderator"),
  upload.array("files", 10),
  createPostMeta
);

// Update PostMeta (Admin + Moderator)
router.put(
  "/:id",
  auth,
  authorize("admin", "moderator"),
  upload.array("files", 10),
  updatePostMeta
);

// Delete PostMeta (Admin only)
router.delete(
  "/:id",
  auth,
  authorize("admin"),
  deletePostMeta
);

// Get PostMeta feed (Public)
router.get("/feed", getPostMetaFeed);

// Get all PostMeta by a specific user (Public)
router.get("/user/:id", getUserPostMetas);

export default router;
