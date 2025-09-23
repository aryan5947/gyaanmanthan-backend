import { PostMeta } from "../../models/PostMeta.js";
import { AuditLog } from "../../models/AuditLog.js";
import { answerCallback, editTelegramMessage } from "../api.js";
import { logger } from "../logger.js";

// 🔧 Utility: Audit log wrapper
async function logAction(action: string, description: string, meta: any, target: string, model: string) {
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

// ✅ Handle Re-score Meta
export async function handleRescore(update: any) {
  const cb = update.callback_query;
  const callbackId = cb.id;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const metaId = cb.data.replace("rescore_", "");

  try {
    // 👉 यहां आप अपनी scoring logic call कर सकते हैं
    await PostMeta.updateOne({ _id: metaId }, { $set: { rescoredAt: new Date() } });

    await logAction("RESCORE_META", `Meta ${metaId} re-scored`, {}, metaId, "PostMeta");
    await answerCallback(callbackId, `♻️ Meta ${metaId} re-scored`);
    await editTelegramMessage(chatId, messageId, `♻️ Meta ${metaId} re-scored`);
  } catch (err) {
    logger.error("Rescore Meta failed:", err);
    await answerCallback(callbackId, `❌ Failed to re-score meta ${metaId}`);
  }
}

// ✅ Handle Normalize Meta
export async function handleNormalize(update: any) {
  const cb = update.callback_query;
  const callbackId = cb.id;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const metaId = cb.data.replace("normalize_", "");

  try {
    // 👉 यहां आप normalization logic call कर सकते हैं
    await PostMeta.updateOne({ _id: metaId }, { $set: { normalized: true, updatedAt: new Date() } });

    await logAction("NORMALIZE_META", `Meta ${metaId} normalized`, {}, metaId, "PostMeta");
    await answerCallback(callbackId, `🧹 Meta ${metaId} normalized`);
    await editTelegramMessage(chatId, messageId, `🧹 Meta ${metaId} normalized`);
  } catch (err) {
    logger.error("Normalize Meta failed:", err);
    await answerCallback(callbackId, `❌ Failed to normalize meta ${metaId}`);
  }
}

// ✅ Handle Flag Meta
export async function handleFlag(update: any) {
  const cb = update.callback_query;
  const callbackId = cb.id;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const metaId = cb.data.replace("flag_", "");

  try {
    await PostMeta.updateOne({ _id: metaId }, { $set: { flagged: true, updatedAt: new Date() } });

    await logAction("FLAG_META", `Meta ${metaId} flagged`, {}, metaId, "PostMeta");
    await answerCallback(callbackId, `🚩 Meta ${metaId} flagged`);
    await editTelegramMessage(chatId, messageId, `🚩 Meta ${metaId} flagged`);
  } catch (err) {
    logger.error("Flag Meta failed:", err);
    await answerCallback(callbackId, `❌ Failed to flag meta ${metaId}`);
  }
}
