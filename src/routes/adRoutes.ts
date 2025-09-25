import express from "express";
import multer from "multer";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { createAd, listAds, clickAd, getSponsoredForFeed } from "../controllers/adController";

const router = express.Router();

// Configure Multer (memory storage if you plan to push to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ✅ Create new ad (with file upload)
router.post(
  "/",
  auth,
  authorize(["admin", "moderator"]),
  upload.single("file"),   // <— must match frontend field name
  createAd
);

// ✅ List all ads
router.get("/", listAds);

// ✅ Click ad (track + redirect)
router.post("/:id/click", clickAd);

// ✅ Get sponsored ad for feed
router.get("/sponsored/one", getSponsoredForFeed);

export default router;
