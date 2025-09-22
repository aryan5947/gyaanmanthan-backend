import { env } from '../config/env.js';
import { TelegramButton } from '../types/telegram.js';
import { logger } from './logger.js';
import { PostMeta } from '../models/PostMeta.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import mongoose from 'mongoose';

const API_URL = `https://api.telegram.org/bot${env.telegram.botToken}`;

// -------------------- Core send helpers --------------------
export async function sendTelegramMessage(text: string, chatId?: string | number) {
  const chat_id = chatId ?? env.telegram.chatId;
  const res = await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text })
  });
  if (!res.ok) {
    logger.error('Telegram sendMessage failed:', res.status, await res.text());
  }
}

export async function sendTelegramAlertWithButtons(
  title: string,
  details: string,
  buttons: TelegramButton[][],
  chatId?: string | number
) {
  const chat_id = chatId ?? env.telegram.chatId;
  const text = `📢 *${title}*\n${details}\n🕒 ${new Date().toLocaleString()}`;
  const res = await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    })
  });
  if (!res.ok) {
    logger.error('Telegram sendMessage (buttons) failed:', res.status, await res.text());
  }
}

export async function answerCallback(callbackId: string, text: string) {
  const res = await fetch(`${API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false })
  });
  if (!res.ok) {
    logger.error('Telegram answerCallbackQuery failed:', res.status, await res.text());
  }
}

export async function setWebhook(url: string) {
  const res = await fetch(`${API_URL}/setWebhook?url=${encodeURIComponent(url)}`);
  logger.info('setWebhook status:', res.status);
}

// -------------------- sendTelegramAlert --------------------
export async function sendTelegramAlert(title: string, details: string, chatId?: string | number) {
  const chat_id = chatId ?? env.telegram.chatId;
  const text = `📢 *${title}*\n${details}\n🕒 ${new Date().toLocaleString()}`;
  const res = await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' })
  });
  if (!res.ok) {
    logger.error('Telegram sendMessage (alert) failed:', res.status, await res.text());
  }
}

// -------------------- Inline keyboards --------------------
function buildUserActionsButtons(user: any): TelegramButton[][] {
  return [
    [
      // Ban/Unban
      { text: user.role === 'banned' ? '♻️ Unban' : '🚫 Ban', callback_data: `${user.role === 'banned' ? 'unban' : 'ban'}_${user._id}` },
      // Golden Tick toggle
      { text: user.isGoldenVerified ? '❌ Remove Tick' : '🏅 Give Tick', callback_data: `toggle_golden_${user._id}` }
    ],
    [
      // Auto Golden Tick
      { text: '🏅 Auto Tick', callback_data: `auto_golden_${user._id}` },
      // Wallet Add
      { text: '💰 +₹100', callback_data: `wallet_add_${user._id}_100` }
    ],
    [
      // Role change
      { text: '🎭 Make Admin', callback_data: `role_admin_${user._id}` },
      { text: '🎭 Make User', callback_data: `role_user_${user._id}` }
    ],
    [
      { text: '📦 Partner Plan', callback_data: `plan_partner_${user._id}` },
      { text: '📦 Free Plan', callback_data: `plan_free_${user._id}` }
    ],
    [
      { text: '📊 Stats', callback_data: `stats_${user._id}` },
      { text: '🔐 Logout', callback_data: `logout_${user._id}` }
    ]
  ];
}
function buildPostActionsButtons(postId: string, ownerId?: string): TelegramButton[][] {
  return [
    [
      { text: '🗑 Delete Post', callback_data: `delete_${postId}` },
      { text: '♻️ Restore Post', callback_data: `restore_${postId}` }
    ],
    [
      { text: '👤 User Actions', callback_data: ownerId ? `actions_${ownerId}` : `post_owner_${postId}` },
      { text: '🔗 View Post', callback_data: `view_${postId}` }
    ],
    [
      { text: '✅ Resolve Post', callback_data: `resolvePost_${postId}` },
      { text: '📝 Resolve Report', callback_data: `resolveMeta_${postId}` }
    ]
  ];
}

// -------------------- Helper for audit logging --------------------
async function logAction(action: string, description: string, meta?: any, target?: any, targetModel?: string) {
  try {
    await AuditLog.create({
      actorType: 'admin',
      action,
      description,
      meta,
      target,
      targetModel
    });
  } catch (err) {
    logger.error('AuditLog create failed:', err);
  }
}

// -------------------- Update handler (MAIN FUTURE-PROOF LOGIC) --------------------
export async function handleTelegramUpdate(update: any) {
  try {
    if (!update.callback_query) return;

    const callbackId = update.callback_query.id;
    const data = update.callback_query.data as string;
    const chatId = update.callback_query.message.chat.id;
    const messageId = update.callback_query.message.message_id;

    // ---------- User Actions Menu ----------
   if (data.startsWith("actions_")) {
    const arg = data.replace("actions_", ""); // could be ObjectId or @username
   try {
    let user: any = null;

    if (arg.startsWith("@")) {
      // username से lookup
      const uname = arg.slice(1).toLowerCase();
      user = await User.findOne({ username: uname }).lean();
    } else {
      // id से lookup
      user = await User.findById(arg).lean();
    }

    if (!user) {
      return await answerCallback(callbackId, `❌ User not found for ${arg}`);
    }

    await sendTelegramAlertWithButtons(
      `Actions for @${user.username}`,
      `Choose an action below:`,
      buildUserActionsButtons(user),
      chatId
    );

    await logAction(
      "ACTIONS_MENU",
      `Opened actions menu for user ${user.username}`,
      {},
      user._id.toString(),
      "User"
    );

     await answerCallback(callbackId, "📋 Actions menu sent");
   } catch (err) {
     logger.error("Send actions menu failed:", err);
     await answerCallback(callbackId, "❌ Failed to send actions menu");
   }
   return;
  }


    // ---------- Post Owner Actions ----------
    if (data.startsWith('post_owner_')) {
      const postId = data.replace('post_owner_', '');
      try {
        const post = await Post.findById(postId).select('user').lean() as any;
        if (!post) return await answerCallback(callbackId, '❌ Post not found');
        const user = await User.findById(post.user).lean() as any;
        if (!user) return await answerCallback(callbackId, '❌ Owner not found');
        await sendTelegramAlertWithButtons(
          `Actions for @${user.username}`,
          `Owner of Post ${postId}`,
          buildUserActionsButtons(user),
          chatId
        );
        await answerCallback(callbackId, '📋 Owner actions menu sent');
      } catch (err) {
        logger.error('Owner actions menu failed:', err);
        await answerCallback(callbackId, '❌ Failed to fetch owner');
      }
      return;
    }

    // ---------- Resolve Meta Report ----------
    if (data.startsWith('resolveMeta_')) {
      const postId = data.replace('resolveMeta_', '');
      try {
        await PostMeta.updateOne({ _id: postId }, { $set: { resolved: true, updatedAt: new Date() } });
        await logAction('RESOLVE_META', `Report resolved for post ${postId}`, {}, postId, 'PostMeta');
        await answerCallback(callbackId, `📝 Report for Post ${postId} resolved`);
        await editTelegramMessage(chatId, messageId, `📝 Report for Post ${postId} resolved`);
      } catch (err) {
        logger.error('ResolveMeta failed:', err);
        await answerCallback(callbackId, `❌ Failed to resolve report for ${postId}`);
      }
      return;
    }

    // ---------- Resolve Post ----------
    if (data.startsWith('resolvePost_')) {
      const postId = data.replace('resolvePost_', '');
      try {
        await Post.updateOne({ _id: postId }, { $set: { resolved: true, updatedAt: new Date() } });
        await logAction('RESOLVE_POST', `Post ${postId} resolved via Telegram`, {}, postId, 'Post');
        await answerCallback(callbackId, `✅ Post ${postId} resolved`);
        await editTelegramMessage(chatId, messageId, `✅ Post ${postId} resolved`);
      } catch (err) {
        logger.error('ResolvePost failed:', err);
        await answerCallback(callbackId, `❌ Failed to resolve post ${postId}`);
      }
      return;
    }

    // ---------- Delete Post ----------
    if (data.startsWith('delete_')) {
      const postId = data.split('_')[1];
      try {
        const objectId = new mongoose.Types.ObjectId(postId);
        await PostMeta.updateOne({ _id: objectId }, { $set: { status: 'deleted', updatedAt: new Date() } });
        await Post.updateOne({ _id: objectId }, { $set: { status: 'deleted', updatedAt: new Date() } });
        await logAction('POST_DELETE', `Post ${postId} deleted via Telegram`, {}, postId, 'Post');
        await answerCallback(callbackId, `✅ Post ${postId} deleted`);
        await editTelegramMessage(chatId, messageId, `🗑 Post ${postId} deleted`);
      } catch (err) {
        logger.error('Delete via Telegram failed:', err);
        await answerCallback(callbackId, `❌ Failed to delete post ${postId}`);
      }
      return;
    }

    // ---------- Restore Post ----------
    if (data.startsWith('restore_')) {
      const postId = data.split('_')[1];
      try {
        const objectId = new mongoose.Types.ObjectId(postId);
        await PostMeta.updateOne({ _id: objectId }, { $set: { status: 'active', updatedAt: new Date() } });
        await Post.updateOne({ _id: objectId }, { $set: { status: 'active', updatedAt: new Date() } });
        await logAction('POST_RESTORE', `Post ${postId} restored via Telegram`, {}, postId, 'Post');
        await answerCallback(callbackId, `♻️ Post ${postId} restored`);
        await editTelegramMessage(chatId, messageId, `♻️ Post ${postId} restored`);
      } catch (err) {
        logger.error('Restore via Telegram failed:', err);
        await answerCallback(callbackId, `❌ Failed to restore post ${postId}`);
      }
      return;
    }

    // ---------- Ban / Unban ----------
    if (data.startsWith('ban_') || data.startsWith('unban_')) {
      const [action, userId] = data.split('_');
      try {
        await User.updateOne({ _id: userId }, { $set: { role: action === 'ban' ? 'banned' : 'user' } });
        await logAction(action === 'ban' ? 'USER_BAN' : 'USER_UNBAN', `${action === 'ban' ? 'Banned' : 'Unbanned'} user ${userId}`, {}, userId, 'User');
        await answerCallback(callbackId, `${action === 'ban' ? '🚫 Banned' : '♻️ Unbanned'} ${userId}`);
      } catch (err) {
        logger.error(`${action} via Telegram failed:`, err);
        await answerCallback(callbackId, `❌ Failed to ${action} user ${userId}`);
      }
      return;
    }

    // ---------- Auto Golden Tick ----------
    if (data.startsWith('auto_golden_')) {
      const userId = data.replace('auto_golden_', '');
      try {
        const user = await User.findById(userId);
        if (!user) return await answerCallback(callbackId, '❌ User not found');
        user.isGoldenVerified = true;
        await user.save();
        await logAction('AUTO_GOLDEN_TICK', `Auto Golden Tick granted to ${user.username}`, {}, userId, 'User');
        await answerCallback(callbackId, `🏅 Auto Golden Tick granted to ${user.username}`);
      } catch (err) {
        logger.error('Auto golden tick failed:', err);
        await answerCallback(callbackId, '❌ Failed to give auto golden tick');
      }
      return;
    }

    // ---------- Golden tick toggle ----------
    if (data.startsWith('toggle_golden_')) {
      const userId = data.replace('toggle_golden_', '');
      try {
        const user = await User.findById(userId);
        if (!user) return await answerCallback(callbackId, '❌ User not found');
        user.isGoldenVerified = !user.isGoldenVerified;
        await user.save();
        await logAction('GOLDEN_TICK_TOGGLE', `Golden Tick ${user.isGoldenVerified ? 'ON' : 'OFF'} for ${user.username}`, { status: user.isGoldenVerified }, userId, 'User');
        await answerCallback(callbackId, `🏅 Golden Tick ${user.isGoldenVerified ? 'ON' : 'OFF'} for ${user.username}`);
      } catch (err) {
        logger.error('Golden tick toggle failed:', err);
        await answerCallback(callbackId, '❌ Failed to toggle golden tick');
      }
      return;
    }

    // ---------- Wallet top-up ----------
    if (data.startsWith('wallet_add_')) {
      const [ , , userId, amountStr ] = data.split('_');
      const amount = parseFloat(amountStr);
      try {
        await User.updateOne({ _id: userId }, { $inc: { walletBalance: amount } });
        await logAction('WALLET_TOPUP', `Wallet credited ₹${amount} for user ${userId}`, { amount }, userId, 'User');
        await answerCallback(callbackId, `💰 Added ₹${amount} to wallet`);
      } catch (err) {
        logger.error('Wallet top-up failed:', err);
        await answerCallback(callbackId, '❌ Failed to add wallet balance');
      }
      return;
    }

    // ---------- Role change ----------
    if (data.startsWith('role_')) {
      const [ , role, userId ] = data.split('_');
      try {
        await User.updateOne({ _id: userId }, { $set: { role } });
        await logAction('ROLE_CHANGE', `Role changed to ${role} for user ${userId}`, { role }, userId, 'User');
        await answerCallback(callbackId, `🎭 Role changed to ${role}`);
      } catch (err) {
        logger.error('Role change failed:', err);
        await answerCallback(callbackId, '❌ Failed to change role');
      }
      return;
    }

    // ---------- Plan upgrade ----------
    if (data.startsWith('plan_')) {
      const [ , plan, userId ] = data.split('_');
      try {
        await User.updateOne({ _id: userId }, { $set: { plan } });
        await logAction('PLAN_UPGRADE', `Plan upgraded to ${plan} for user ${userId}`, { plan }, userId, 'User');
        await answerCallback(callbackId, `📦 Plan upgraded to ${plan}`);
      } catch (err) {
        logger.error('Plan upgrade failed:', err);
        await answerCallback(callbackId, '❌ Failed to upgrade plan');
      }
      return;
    }

    // ---------- Stats ----------
    if (data.startsWith('stats_')) {
      const userId = data.replace('stats_', '');
      try {
        const user = await User.findById(userId);
        if (!user) return await answerCallback(callbackId, '❌ User not found');
        const stats = `
👤 ${user.username}
🏅 Golden Tick: ${user.isGoldenVerified ? 'Yes' : 'No'}
📦 Plan: ${user.plan}
💰 Wallet: ₹${user.walletBalance}
👥 Followers: ${user.followersCount}
📝 Posts: ${user.postsCount}
        `;
        await logAction('VIEW_STATS', `Viewed stats for user ${user.username}`, {}, userId, 'User');
        await sendTelegramMessage(stats, chatId);
        await answerCallback(callbackId, '📊 Stats sent');
      } catch (err) {
        logger.error('Stats fetch failed:', err);
        await answerCallback(callbackId, '❌ Failed to fetch stats');
      }
      return;
    }

    // ---------- Force logout ----------
    if (data.startsWith('logout_')) {
      const userId = data.replace('logout_', '');
      try {
        await User.updateOne({ _id: userId }, { $set: { sessionVersion: Date.now() } });
        await logAction('FORCE_LOGOUT', `Forced logout for user ${userId}`, {}, userId, 'User');
        await answerCallback(callbackId, `🔐 Forced logout for ${userId}`);
      } catch (err) {
        logger.error('Force logout failed:', err);
        await answerCallback(callbackId, '❌ Failed to force logout');
      }
      return;
    }

    // ---------- View post link ----------
    if (data.startsWith('view_')) {
      const postId = data.replace('view_', '');
      const link = `${env.appUrl}/post/${postId}`;
      await logAction('VIEW_POST_LINK', `Viewed post link for ${postId}`, {}, postId, 'Post');
      await sendTelegramMessage(`🔗 ${link}`, chatId);
      await answerCallback(callbackId, '🔗 Link sent');
      return;
    }

  } catch (err) {
    logger.error('handleTelegramUpdate error:', err);
  }
}

// -------------------- Helper --------------------
async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  await fetch(`${API_URL}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text })
  });
}

// -------------------- DEMO helpers for testing --------------------
export async function sendUserActionsMenu(userId: string, chatId?: string | number) {
  try {
    const user = await User.findById(userId).lean() as any;
    if (!user) {
      return await sendTelegramMessage(`❌ User ${userId} not found`, chatId);
    }
    await sendTelegramAlertWithButtons(
      `Actions for @${user.username}`,
      `Choose an action below:`,
      buildUserActionsButtons(user),
      chatId
    );
    await logAction('SEND_MENU', `Sent user actions menu manually`, {}, userId, 'User');
  } catch (err) {
    logger.error('sendUserActionsMenu failed:', err);
  }
}
export async function sendPostActionsMenu(postId: string, chatId?: string | number) {
  try {
    const post = await Post.findById(postId).lean() as any;
    if (!post) {
      return await sendTelegramMessage(`❌ Post ${postId} not found`, chatId);
    }
    await sendTelegramAlertWithButtons(
      `Actions for Post ${postId}`,
      `Choose an action below:`,
      buildPostActionsButtons(postId, post.user?.toString()),
      chatId
    );
    await logAction('SEND_MENU', `Sent post actions menu manually`, {}, postId, 'Post');
  } catch (err) {
    logger.error('sendPostActionsMenu failed:', err);
  }
}