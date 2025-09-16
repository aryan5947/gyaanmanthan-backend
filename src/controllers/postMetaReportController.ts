import { Request, Response } from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { PostMeta } from "../models/PostMeta";
import { sendTelegramAlertWithButtons } from "../utils/telegramBot";
import { createNotification } from "../utils/createNotification";

type PostMetaOwner = { user: mongoose.Types.ObjectId };

export async function reportPostMeta(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { postMetaId } = req.params;
  const { reason, details } = req.body;
  const reportedBy = req.user.id;
  const reportId = uuidv4();

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ ok: false, message: "Reason is required" });
  }

  try {
    // 1️⃣ Telegram alert to admins
    await sendTelegramAlertWithButtons(
      "🚨 PostMeta Reported",
      `Report ID: ${reportId}
PostMeta ID: ${postMetaId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}`,
      [
        [{ text: "✅ ResolveMeta", callback_data: `resolveMeta_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postMetaId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    // 2️⃣ Notify postMeta owner
    const postMeta = await PostMeta.findById(postMetaId)
      .select("user")
      .lean<PostMetaOwner>();

    if (postMeta) {
      await createNotification({
        userId: postMeta.user,
        type: "report",
        message: `Your postMeta was reported by ${req.user.username}`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(postMetaId)
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Report submitted successfully",
      reportId
    });
  } catch (err: any) {
    console.error("Error reporting postMeta:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to process report"
    });
  }
}
