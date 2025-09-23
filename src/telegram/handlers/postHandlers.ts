import mongoose from "mongoose";
import { PostMeta } from "../../models/PostMeta.js";
import { Post } from "../../models/Post.js";
import { logger } from "../logger.js";
import { answerCallback, editTelegramMessage, sendTelegramMessage } from "../api.js";
import { AuditLog } from "../../models/AuditLog.js";
import { env } from "../../config/env.js";

async function logAction(action: string, description: string, meta: any, target: string, model: string) {
  try {
    await AuditLog.create({ actorType: "admin", action, description, meta, target, targetModel: model });
  } catch (err) {
    logger.error("AuditLog failed:", err);
  }
}

// 🔧 Utility: Update Post + PostMeta status
async function updatePostAndMetaStatus(postId: string, status: "active" | "deleted") {
  const objectId = new mongoose.Types.ObjectId(postId);
  await PostMeta.updateOne({ _id: objectId }, { $set: { status, updatedAt: new Date() } });
  await Post.updateOne({ _id: objectId }, { $set: { status, updatedAt: new Date() } });
}

// 🔧 Utility: Resolve entity (Post or PostMeta)
async function resolveEntity(postId: string, type: "Post" | "PostMeta") {
  const objectId = new mongoose.Types.ObjectId(postId);
  if (type === "Post") {
    await Post.updateOne({ _id: objectId }, { $set: { resolved: true, updatedAt: new Date() } });
  } else {
    await PostMeta.updateOne({ _id: objectId }, { $set: { resolved: true, updatedAt: new Date() } });
  }
}

// Delete Post
export async function handleDelete(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const postId = update.callback_query.data.split("_")[1];
  try {
    await updatePostAndMetaStatus(postId, "deleted");
    await logAction("POST_DELETE", `Post ${postId} deleted`, {}, postId, "Post");
    await answerCallback(callbackId, `✅ Post ${postId} deleted`);
    await editTelegramMessage(chatId, messageId, `🗑 Post ${postId} deleted`);
  } catch (err) {
    logger.error("Delete failed:", err);
    await answerCallback(callbackId, `❌ Failed to delete post ${postId}`);
  }
}

// Restore Post
export async function handleRestore(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const postId = update.callback_query.data.split("_")[1];
  try {
    await updatePostAndMetaStatus(postId, "active");
    await logAction("POST_RESTORE", `Post ${postId} restored`, {}, postId, "Post");
    await answerCallback(callbackId, `♻️ Post ${postId} restored`);
    await editTelegramMessage(chatId, messageId, `♻️ Post ${postId} restored`);
  } catch (err) {
    logger.error("Restore failed:", err);
    await answerCallback(callbackId, `❌ Failed to restore post ${postId}`);
  }
}

// Resolve Report (Meta)
export async function handleResolveMeta(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const postId = update.callback_query.data.replace("resolveMeta_", "");
  try {
    await resolveEntity(postId, "PostMeta");
    await logAction("RESOLVE_META", `Report resolved for ${postId}`, {}, postId, "PostMeta");
    await answerCallback(callbackId, `📝 Report for Post ${postId} resolved`);
    await editTelegramMessage(chatId, messageId, `📝 Report for Post ${postId} resolved`);
  } catch (err) {
    logger.error("Resolve Meta failed:", err);
    await answerCallback(callbackId, `❌ Failed to resolve report ${postId}`);
  }
}

// Resolve Post
export async function handleResolvePost(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const messageId = update.callback_query.message.message_id;
  const postId = update.callback_query.data.replace("resolvePost_", "");
  try {
    await resolveEntity(postId, "Post");
    await logAction("RESOLVE_POST", `Post ${postId} resolved`, {}, postId, "Post");
    await answerCallback(callbackId, `✅ Post ${postId} resolved`);
    await editTelegramMessage(chatId, messageId, `✅ Post ${postId} resolved`);
  } catch (err) {
    logger.error("Resolve Post failed:", err);
    await answerCallback(callbackId, `❌ Failed to resolve post ${postId}`);
  }
}

// View Post
export async function handleViewPost(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const postId = update.callback_query.data.replace("view_", "");
  const link = `${env.appUrl}/post/${postId}`;
  try {
    await logAction("VIEW_POST", `Viewed post ${postId}`, {}, postId, "Post");
    await sendTelegramMessage(`🔗 ${link}`, chatId);
    await answerCallback(callbackId, "🔗 Link sent");
  } catch (err) {
    logger.error("View Post failed:", err);
    await answerCallback(callbackId, "❌ Failed to send link");
  }
}
