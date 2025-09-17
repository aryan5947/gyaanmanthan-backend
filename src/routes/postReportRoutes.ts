import { Router } from "express";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { PostReport } from "../models/PostReport";

const router = Router();

// Admin/moderator: get all reports
router.get("/", auth, authorize(["admin", "moderator"]), async (req, res) => {
  const reports = await PostReport.find().sort({ createdAt: -1 });
  res.json({ reports });
});

// User: get own reports
router.get("/my", auth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const reports = await PostReport.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
  res.json({ reports });
});

export default router;
