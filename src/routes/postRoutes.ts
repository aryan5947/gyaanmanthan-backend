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
import { reportPost } from "../controllers/postReportController"; // ✅ new import
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";
import { createNotification } from "../utils/createNotification";
import { Post } from "../models/Post";

const router = Router();
type PostOwner = { user: mongoose.Types.ObjectId };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// CREATE / UPDATE / DELETE
router.post("/", auth, authorize(["admin", "moderator", "user"]), upload.array("images", 10), createPost);
router.put("/:id", auth, authorize(["admin", "moderator", "user"], true), filterRestricted("post"), upload.array("images", 10), updatePost);
router.delete("/:id", auth, authorize(["admin", "user"], true), filterRestricted("post"), deletePost);

// LIKE
router.post("/:id/like", auth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    await likePost(req, res);
    const post = await Post.findById(req.params.id).select("user").lean<PostOwner>();
    if (post && req.user.id !== post.user.toString()) {
      await createNotification({
        userId: post.user,
        type: "like",
        message: `${req.user.username} liked your post`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) { next(err); }
});
router.delete("/:id/like", auth, unlikePost);

// SAVE
router.post("/:id/save", auth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    await savePost(req, res);
    const post = await Post.findById(req.params.id).select("user").lean<PostOwner>();
    if (post && req.user.id !== post.user.toString()) {
      await createNotification({
        userId: post.user,
        type: "save",
        message: `${req.user.username} saved your post`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) { next(err); }
});
router.delete("/:id/save", auth, unsavePost);

// REPORT (moved to controller)
router.post("/:postId/report", auth, reportPost);

// GET
router.get("/feed", getFeed);
router.get("/user/:id", getUserPosts);
router.get("/:id", filterRestricted("post"), getPostById);

export default router;
