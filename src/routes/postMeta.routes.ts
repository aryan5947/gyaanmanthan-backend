import { Router } from "express";
import multer from "multer";
import {
  createPostMeta,
  updatePostMeta,
  deletePostMeta,
  getPostMetaFeed,
  getUserPostMetas,
} from "../controllers/postMetaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

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

// Update PostMeta (Admin + Moderator + Owner)
router.put(
  "/:id",
  auth,
  authorize(["admin", "moderator", "user"], true), // role + ownership check
  upload.array("files", 10),
  updatePostMeta
);

// Delete PostMeta (Admin + Owner)
router.delete(
  "/:id",
  auth,
  authorize(["admin", "user"], true), // role + ownership check
  deletePostMeta
);

// Get PostMeta feed (Public)
router.get("/feed", getPostMetaFeed);

// Get all PostMeta by a specific user (Public)
router.get("/user/:id", getUserPostMetas);

export default router;
