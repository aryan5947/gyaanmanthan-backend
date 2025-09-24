import express from "express";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { createAd, listAds, clickAd, getSponsoredForFeed } from "../controllers/adController";

const router = express.Router();

// ✅ Create new ad
router.post("/", auth, authorize(["admin","moderator"]), createAd);

// ✅ List all ads
router.get("/", listAds);

// ✅ Click ad (track + redirect)
router.post("/:id/click", clickAd);

// ✅ Get sponsored ad for feed
router.get("/sponsored/one", getSponsoredForFeed);

export default router;
