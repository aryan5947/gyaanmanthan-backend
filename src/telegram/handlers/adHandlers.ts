import mongoose from "mongoose";
import { PostMeta } from "../../models/PostMeta.js";
import { logger } from "../logger.js";
import { answerCallback, editTelegramMessage, sendTelegramAlertWithButtons, sendTelegramMessage } from "../api.js";
import { AuditLog } from "../../models/AuditLog.js";
import { env } from "../../config/env.js";

async function logAction(
  action: string,
  description: string,
  meta: any,
  target: string,
  model: string
) {
  try {
    await AuditLog.create({
      actorType: "admin",
      action,
      description,
      meta,
      target,
      targetModel: model,
    });
  } catch (err) {
    logger.error("AuditLog failed:", err);
  }
}

// 🔧 Utility: Update Ad status
async function updateAdStatus(adId: string, status: "active" | "deleted") {
  const objectId = new mongoose.Types.ObjectId(adId);
  await PostMeta.updateOne(
    { _id: objectId, postType: "ad" },
    { $set: { status, updatedAt: new Date() } }
  );
}

// 🔧 Utility: Resolve Ad
async function resolveAdEntity(adId: string) {
  const objectId = new mongoose.Types.ObjectId(adId);
  await PostMeta.updateOne(
    { _id: objectId, postType: "ad" },
    { $set: { resolved: true, updatedAt: new Date() } }
  );
}

// 📢 Show Ad Menu
export async function handleAdMenu(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const adId = update.callback_query.data.split("_")[1];

  try {
    const ad = await PostMeta.findOne({ _id: adId, postType: "ad" }).lean();
    if (!ad) {
      return await answerCallback(callbackId, `❌ Ad ${adId} not found`);
    }

    const text = `
📢 *Ad Info*
🆔 ${ad._id}
📌 ${ad.title}
📝 ${ad.description || "—"}
🔗 ${ad.ctaUrl || "N/A"}
👀 Views: ${ad.stats?.views || 0}
👆 Clicks: ${ad.stats?.clicks || 0}
    `;

    const buttons = [
      [{ text: "🗑 Delete", callback_data: `deleteAd_${ad._id}` }],
      [{ text: "♻️ Restore", callback_data: `restoreAd_${ad._id}` }],
      [{ text: "✅ Resolve", callback_data: `resolveAd_${ad._id}` }],
      [{ text: "🔗 View Ad", callback_data: `viewAd_${ad._id}` }],
    ];

    await logAction("AD_MENU", `Viewed Ad ${adId} menu`, {}, adId, "PostMeta");
    return await sendTelegramAlertWithButtons("📢 Ad Menu", text, buttons, chatId);
  } catch (err) {
    logger.error("handleAdMenu failed:", err);
    return await answerCallback(callbackId, "❌ Failed to load ad menu");
  }
}

// 🗑 Delete Ad
export async function handleDeleteAd(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const adId = update.callback_query.data.split("_")[1];
  try {
    await updateAdStatus(adId, "deleted");
    await logAction("AD_DELETE", `Ad ${adId} deleted`, {}, adId, "PostMeta");
    await answerCallback(callbackId, `✅ Ad ${adId} deleted`);
    await editTelegramMessage(chatId, messageId, `🗑 Ad ${adId} deleted`);
  } catch (err) {
    logger.error("Delete Ad failed:", err);
    await answerCallback(callbackId, `❌ Failed to delete ad ${adId}`);
  }
}

// ♻️ Restore Ad
export async function handleRestoreAd(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const adId = update.callback_query.data.split("_")[1];
  try {
    await updateAdStatus(adId, "active");
    await logAction("AD_RESTORE", `Ad ${adId} restored`, {}, adId, "PostMeta");
    await answerCallback(callbackId, `♻️ Ad ${adId} restored`);
    await editTelegramMessage(chatId, messageId, `♻️ Ad ${adId} restored`);
  } catch (err) {
    logger.error("Restore Ad failed:", err);
    await answerCallback(callbackId, `❌ Failed to restore ad ${adId}`);
  }
}

// ✅ Resolve Ad
export async function handleResolveAd(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const adId = update.callback_query.data.replace("resolveAd_", "");
  try {
    await resolveAdEntity(adId);
    await logAction("RESOLVE_AD", `Ad ${adId} resolved`, {}, adId, "PostMeta");
    await answerCallback(callbackId, `✅ Ad ${adId} resolved`);
    await editTelegramMessage(chatId, messageId, `✅ Ad ${adId} resolved`);
  } catch (err) {
    logger.error("Resolve Ad failed:", err);
    await answerCallback(callbackId, `❌ Failed to resolve ad ${adId}`);
  }
}

// 🔗 View Ad
export async function handleViewAd(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const adId = update.callback_query.data.replace("viewAd_", "");
  const link = `${env.appUrl}/ad/${adId}`;

  try {
    await logAction("VIEW_AD", `Viewed ad ${adId}`, {}, adId, "PostMeta");
    await sendTelegramMessage(`🔗 ${link}`, chatId);
    await answerCallback(callbackId, "🔗 Ad link sent");
  } catch (err) {
    logger.error("View Ad failed:", err);
    await answerCallback(callbackId, "❌ Failed to send ad link");
  }
}
