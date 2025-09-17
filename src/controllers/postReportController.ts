import { Request, Response } from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Post } from "../models/Post";
import { PostReport } from "../models/PostReport";
import { sendTelegramAlertWithButtons, sendTelegramMessage } from "../utils/telegramBot";
import { createNotification } from "../utils/createNotification";

type PostOwner = { authorId: mongoose.Types.ObjectId };

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
    // 0️⃣ Save report in DB
    await PostReport.create({
      postId: new mongoose.Types.ObjectId(postId),
      reporterId: new mongoose.Types.ObjectId(reportedBy),
      reason: reason.trim(),
      status: "open"
    });

    // 🔗 Direct link to reported Post
    const postLink = `${process.env.APP_BASE_URL}/post/${postId}`;

    // 1️⃣ Telegram alert to admins (with link)
    await sendTelegramAlertWithButtons(
      "🚨 Post Reported",
      `Report ID: ${reportId}
Post ID: ${postId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}
🔗 [View Post](${postLink})`,
      [
        [{ text: "✅ Resolve", callback_data: `resolve_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    // 2️⃣ Notify post owner (structured)
    const post = await Post.findById(postId)
      .select("authorId")
      .lean<PostOwner>();

    if (post?.authorId) {
      await createNotification({
        userId: post.authorId,
        type: "report",
        message: `Your post was reported by ${req.user.username}`,
        reason,
        details: details?.trim() || "—",
        link: postLink,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPost: new mongoose.Types.ObjectId(postId)
      });
    } else {
      console.warn(`Post ${postId} has no authorId — skipping owner notification`);
    }

    // 3️⃣ Notify reporter (acknowledgement)
    await createNotification({
      userId: new mongoose.Types.ObjectId(reportedBy),
      type: "report_ack",
      message: `Thanks for reporting. Our team will review your report for Post ID: ${postId}`,
      reason,
      details: details?.trim() || "—",
      link: postLink
    });

    // 4️⃣ Optional: Telegram DM to reporter (if chatId stored in user profile)
    if ((req.user as any).telegramChatId) {
      await sendTelegramMessage(
        (req.user as any).telegramChatId,
        `✅ Thanks for reporting!\n\nPost ID: ${postId}\nReason: ${reason}\nDetails: ${details?.trim() || "—"}\n\nOur team will review it shortly.`
      );
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
