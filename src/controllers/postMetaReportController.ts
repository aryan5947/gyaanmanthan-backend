import { Request, Response } from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { PostMeta } from "../models/PostMeta";
import { PostMetaReport } from "../models/PostMetaReport";
import { sendTelegramAlertWithButtons, sendTelegramMessage } from "../utils/telegramBot";
import { createNotification } from "../utils/createNotification";

type PostMetaOwner = { authorId: mongoose.Types.ObjectId };

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
    // 0️⃣ Save report in DB
    await PostMetaReport.create({
      postMetaId: new mongoose.Types.ObjectId(postMetaId),
      reporterId: new mongoose.Types.ObjectId(reportedBy),
      reason: reason.trim(),
      status: "open"
    });

    // 🔗 Direct link to reported PostMeta
    const postMetaLink = `${process.env.APP_BASE_URL}/post-meta/${postMetaId}`;

    // 1️⃣ Telegram alert to admins (with link)
    await sendTelegramAlertWithButtons(
      "🚨 PostMeta Reported",
      `Report ID: ${reportId}
PostMeta ID: ${postMetaId}
Reason: ${reason}
Details: ${details?.trim() || "—"}
By: ${reportedBy}
🔗 [View PostMeta](${postMetaLink})`,
      [
        [{ text: "✅ ResolveMeta", callback_data: `resolveMeta_${reportId}` }],
        [{ text: "🗑 Delete Post", callback_data: `delete_${postMetaId}` }],
        [{ text: "🚫 Ban User", callback_data: `ban_${reportedBy}` }],
      ]
    );

    // 2️⃣ Notify postMeta owner (structured)
    const postMeta = await PostMeta.findById(postMetaId)
      .select("authorId")
      .lean<PostMetaOwner>();

    if (postMeta?.authorId) {
      await createNotification({
        userId: postMeta.authorId,
        type: "report",
        message: `Your postMeta was reported by ${req.user.username}`,
        reason,
        details: details?.trim() || "—",
        link: postMetaLink,
        relatedUser: new mongoose.Types.ObjectId(req.user.id),
        relatedPostMeta: new mongoose.Types.ObjectId(postMetaId)
      });
    } else {
      console.warn(`PostMeta ${postMetaId} has no authorId — skipping owner notification`);
    }

    // 3️⃣ Notify reporter (acknowledgement)
    await createNotification({
      userId: new mongoose.Types.ObjectId(reportedBy),
      type: "report_ack",
      message: `Thanks for reporting. Our team will review your report for PostMeta ID: ${postMetaId}`,
      reason,
      details: details?.trim() || "—",
      link: postMetaLink
    });

    // 4️⃣ Optional: Telegram DM to reporter (if chatId stored in user profile)
    if ((req.user as any).telegramChatId) {
      await sendTelegramMessage(
        (req.user as any).telegramChatId,
        `✅ Thanks for reporting!\n\nPostMeta ID: ${postMetaId}\nReason: ${reason}\nDetails: ${details?.trim() || "—"}\n\nOur team will review it shortly.`
      );
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
