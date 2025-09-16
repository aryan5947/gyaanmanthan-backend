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
import { reportPostMeta } from "../controllers/postMetaReportController"; // ✅ new import
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { filterRestricted } from "../middleware/filterRestricted";
import { createNotification } from "../utils/createNotification";
import { PostMeta } from "../models/PostMeta";

const router = Router();
type PostMetaOwner = { user: mongoose.Types.ObjectId };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// CREATE / UPDATE / DELETE
router.post("/", auth, authorize(["admin", "moderator", "user"]), upload.array("files", 10), createPostMeta);
router.put("/:id", auth, authorize(["admin", "moderator", "user"], true), filterRestricted("postMeta"), upload.array("files", 10), updatePostMeta);
router.delete("/:id", auth, authorize(["admin", "user"], true), filterRestricted("postMeta"), deletePostMeta);

// LIKE
router.post("/:id/like", auth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    await likePostMeta(req, res);
    const postMeta = await PostMeta.findById(req.params.id).select("user").lean<PostMetaOwner>();
    if (postMeta && req.user.id !== postMeta.user.toString()) {
      await createNotification({
        userId: postMeta.user,
        type: "like",
        message: `${req.user.username} liked your postMeta`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) { next(err); }
});
router.delete("/:id/like", auth, unlikePostMeta);

// SAVE
router.post("/:id/save", auth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    await savePostMeta(req, res);
    const postMeta = await PostMeta.findById(req.params.id).select("user").lean<PostMetaOwner>();
    if (postMeta && req.user.id !== postMeta.user.toString()) {
      await createNotification({
        userId: postMeta.user,
        type: "save",
        message: `${req.user.username} saved your postMeta`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(req.params.id)
      });
    }
  } catch (err) { next(err); }
});
router.delete("/:id/save", auth, unsavePostMeta);

// REPORT (moved to controller)
router.post("/:postMetaId/report", auth, reportPostMeta);

// GET
router.get("/feed", getPostMetaFeed);
router.get("/user/:id", getUserPostMetas);
router.get("/:id", filterRestricted("postMeta"), getPostMetaById);

export default router;
