import { User } from "../../models/User.js";
import { logger } from "../logger.js";
import { answerCallback, sendTelegramMessage } from "../api.js";
import { AuditLog } from "../../models/AuditLog.js";
import { env } from "../../config/env.js";

// helper to log
async function logAction(action: string, description: string, meta: any, target: string, model: string) {
  try {
    await AuditLog.create({ actorType: "admin", action, description, meta, target, targetModel: model });
  } catch (err) {
    logger.error("AuditLog failed:", err);
  }
}

// Ban
export async function handleBan(update: any) {
  const callbackId = update.callback_query.id;
  const [, userId] = update.callback_query.data.split("_");
  try {
    await User.updateOne({ _id: userId }, { $set: { role: "banned" } });
    await logAction("USER_BAN", `Banned user ${userId}`, {}, userId, "User");
    await answerCallback(callbackId, `🚫 Banned ${userId}`);
  } catch (err) {
    logger.error("Ban failed:", err);
    await answerCallback(callbackId, "❌ Failed to ban user");
  }
}

// Unban
export async function handleUnban(update: any) {
  const callbackId = update.callback_query.id;
  const [, userId] = update.callback_query.data.split("_");
  try {
    await User.updateOne({ _id: userId }, { $set: { role: "user" } });
    await logAction("USER_UNBAN", `Unbanned user ${userId}`, {}, userId, "User");
    await answerCallback(callbackId, `♻️ Unbanned ${userId}`);
  } catch (err) {
    logger.error("Unban failed:", err);
    await answerCallback(callbackId, "❌ Failed to unban user");
  }
}

// Toggle Golden Tick
export async function handleToggleGolden(update: any) {
  const callbackId = update.callback_query.id;
  const userId = update.callback_query.data.replace("toggle_golden_", "");
  try {
    const user = await User.findById(userId);
    if (!user) return await answerCallback(callbackId, "❌ User not found");
    user.isGoldenVerified = !user.isGoldenVerified;
    await user.save();
    await logAction("GOLDEN_TICK_TOGGLE", `Golden Tick ${user.isGoldenVerified ? "ON" : "OFF"} for ${user.username}`, { status: user.isGoldenVerified }, userId, "User");
    await answerCallback(callbackId, `🏅 Golden Tick ${user.isGoldenVerified ? "ON" : "OFF"} for ${user.username}`);
  } catch (err) {
    logger.error("Toggle Golden failed:", err);
    await answerCallback(callbackId, "❌ Failed to toggle golden tick");
  }
}

// Auto Golden Tick
export async function handleAutoGolden(update: any) {
  const callbackId = update.callback_query.id;
  const userId = update.callback_query.data.replace("auto_golden_", "");
  try {
    const user = await User.findById(userId);
    if (!user) return await answerCallback(callbackId, "❌ User not found");
    user.isGoldenVerified = true;
    await user.save();
    await logAction("AUTO_GOLDEN_TICK", `Auto golden tick for ${user.username}`, {}, userId, "User");
    await answerCallback(callbackId, `🏅 Auto Golden Tick for ${user.username}`);
  } catch (err) {
    logger.error("Auto Golden failed:", err);
    await answerCallback(callbackId, "❌ Failed auto golden tick");
  }
}

// Wallet Add
export async function handleWalletAdd(update: any) {
  const callbackId = update.callback_query.id;
  const [, , userId, amountStr] = update.callback_query.data.split("_");
  const amount = parseFloat(amountStr);
  try {
    await User.updateOne({ _id: userId }, { $inc: { walletBalance: amount } });
    await logAction("WALLET_TOPUP", `Wallet credited ₹${amount} for user ${userId}`, { amount }, userId, "User");
    await answerCallback(callbackId, `💰 Added ₹${amount} to wallet`);
  } catch (err) {
    logger.error("Wallet Add failed:", err);
    await answerCallback(callbackId, "❌ Failed to add wallet");
  }
}

// Role Change
export async function handleRoleChange(update: any) {
  const callbackId = update.callback_query.id;
  const [, role, userId] = update.callback_query.data.split("_");
  try {
    await User.updateOne({ _id: userId }, { $set: { role } });
    await logAction("ROLE_CHANGE", `Role changed to ${role} for ${userId}`, { role }, userId, "User");
    await answerCallback(callbackId, `🎭 Role changed to ${role}`);
  } catch (err) {
    logger.error("Role change failed:", err);
    await answerCallback(callbackId, "❌ Failed to change role");
  }
}

// Plan Change
export async function handlePlanChange(update: any) {
  const callbackId = update.callback_query.id;
  const [, plan, userId] = update.callback_query.data.split("_");
  try {
    await User.updateOne({ _id: userId }, { $set: { plan } });
    await logAction("PLAN_CHANGE", `Plan changed to ${plan} for ${userId}`, { plan }, userId, "User");
    await answerCallback(callbackId, `📦 Plan changed to ${plan}`);
  } catch (err) {
    logger.error("Plan change failed:", err);
    await answerCallback(callbackId, "❌ Failed to change plan");
  }
}

// Stats
export async function handleStats(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const userId = update.callback_query.data.replace("stats_", "");
  try {
    const user = await User.findById(userId);
    if (!user) return await answerCallback(callbackId, "❌ User not found");
    const stats = `
👤 ${user.username}
🏅 Golden Tick: ${user.isGoldenVerified ? "Yes" : "No"}
📦 Plan: ${user.plan}
💰 Wallet: ₹${user.walletBalance}
👥 Followers: ${user.followersCount}
📝 Posts: ${user.postsCount}
`;
    await logAction("VIEW_STATS", `Viewed stats of ${user.username}`, {}, userId, "User");
    await sendTelegramMessage(stats, chatId);
    await answerCallback(callbackId, "📊 Stats sent");
  } catch (err) {
    logger.error("Stats failed:", err);
    await answerCallback(callbackId, "❌ Failed to fetch stats");
  }
}

// Logout
export async function handleLogout(update: any) {
  const callbackId = update.callback_query.id;
  const userId = update.callback_query.data.replace("logout_", "");
  try {
    await User.updateOne({ _id: userId }, { $set: { sessionVersion: Date.now() } });
    await logAction("FORCE_LOGOUT", `Force logout ${userId}`, {}, userId, "User");
    await answerCallback(callbackId, `🔐 Forced logout for ${userId}`);
  } catch (err) {
    logger.error("Logout failed:", err);
    await answerCallback(callbackId, "❌ Failed to logout");
  }
}
