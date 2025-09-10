import { Router } from "express";
import multer from "multer";
import {
  createPost,
  updatePost,
  deletePost,
  getFeed,
  getUserPosts,
  getPostById,
} from "../controllers/postController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";

const router = Router();

// Multer setup (for file uploads, Cloudinary integration will happen in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// ---------------- ROUTES ----------------

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

// Get Post feed (Public)
router.get("/feed", getFeed);

// Get all posts by a specific user (Public)
router.get("/user/:id", getUserPosts);

// Get single post by ID (Public) — block if restricted
router.get("/:id", filterRestricted("post"), getPostById);

export default router;
