import { Router } from "express";
import multer from "multer";
import {
  createPostMeta,
  updatePostMeta,
  deletePostMeta,
  getPostMetaFeed,
  getUserPostMetas,
  getPostMetaById // ✅ Add this in controller if not already present
} from "../controllers/postMetaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted"; // ✅ Added

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
  authorize(["admin", "moderator", "user"]), // role check only
  upload.array("files", 10),
  createPostMeta
);

// Update PostMeta (Admin + Moderator + Owner) — block if restricted
router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true), // role + ownership check
  filterRestricted("postMeta"), // ✅ Added
  upload.array("files", 10),
  updatePostMeta
);

// Delete PostMeta (Admin + Owner) — block if restricted
router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true), // role + ownership check
  filterRestricted("postMeta"), // ✅ Added
  deletePostMeta
);

// Get PostMeta feed (Public)
router.get("/feed", getPostMetaFeed);

// Get all PostMeta by a specific user (Public)
router.get("/user/:id", getUserPostMetas);

// Get single PostMeta by ID (Public) — block if restricted
router.get("/:id", filterRestricted("postMeta"), getPostMetaById); // ✅ Added

export default router;
