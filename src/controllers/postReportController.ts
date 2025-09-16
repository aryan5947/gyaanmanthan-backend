import { Request, Response } from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Post } from "../models/Post";
import { sendTelegramAlertWithButtons } from "../utils/telegramBot";
import { createNotification } from "../utils/createNotification";

type PostOwner = { user: mongoose.Types.ObjectId };

export async function reportPost(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const { postId } = req.params;
  const { reason, details } = req.body;
  const reportedBy = req.user.id;
  const reportId = uuidv4();

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ ok: false, message: "Reason is required" });
  }

  try {
    // 1️⃣ Telegram alert to admins
    await sendTelegramAlertWithButtons(
      "🚨 Post Reported",
      `Report ID: ${reportId}
Post ID: ${postId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}`,
      [
        [{ text: "✅ Resolve", callback_data: `resolve_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    // 2️⃣ Notify post owner
    const post = await Post.findById(postId)
      .select("user")
      .lean<PostOwner>();

    if (post) {
      await createNotification({
        userId: post.user,
        type: "report",
        message: `Your post was reported by ${req.user.username}`,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(postId)
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Report submitted successfully",
      reportId
    });
  } catch (err: any) {
    console.error("Error reporting post:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to process report"
    });
  }
}
