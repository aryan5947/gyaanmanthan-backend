import { env } from '../config/env.js';
import { TelegramButton } from '../types/telegram.js';
import { logger } from './logger.js';
import { PostMeta } from '../models/PostMeta.js'; // named import
import { Post } from '../models/Post.js'; // named import

// Base API URL
const API_URL = `https://api.telegram.org/bot${env.telegram.botToken}`;

/**
 * Send a plain text message to Telegram
 */
export async function sendTelegramMessage(text: string, chatId?: string | number) {
  const chat_id = chatId ?? env.telegram.chatId;

  const res = await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text })
  });

  if (!res.ok) {
    const t = await res.text();
    logger.error('Telegram sendMessage failed:', res.status, t);
  }
}

/**
 * Send a formatted alert with optional details
 */
export async function sendTelegramAlert(
  title: string,
  details?: string,
  chatId?: string | number
) {
  const text = `📢 ${title}${details ? `\n${details}` : ''}\n🕒 ${new Date().toLocaleString()}`;
  return sendTelegramMessage(text, chatId);
}

/**
 * Send an alert with inline buttons
 */
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
    const t = await res.text();
    logger.error('Telegram sendMessage (buttons) failed:', res.status, t);
  }
}

/**
 * Answer a callback query from an inline button
 */
export async function answerCallback(callbackId: string, text: string) {
  const res = await fetch(`${API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false })
  });

  if (!res.ok) {
    const t = await res.text();
    logger.error('Telegram answerCallbackQuery failed:', res.status, t);
  }
}

/**
 * Optional: Set webhook programmatically
 */
export async function setWebhook(url: string) {
  const res = await fetch(`${API_URL}/setWebhook?url=${encodeURIComponent(url)}`);
  logger.info('setWebhook status:', res.status);
}

/**
 * Handle incoming Telegram webhook updates (messages + callbacks)
 */
export async function handleTelegramUpdate(update: any) {
  try {
    if (update.callback_query) {
      const callbackId = update.callback_query.id;
      const data = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;

      // 🗑 Delete Post
      if (data.startsWith('delete_')) {
        const postMetaId = data.split('_')[1];
        try {
          // Delete from PostMeta
          await PostMeta.deleteOne({ _id: postMetaId });
          // Delete from Post (main posts collection)
          await Post.deleteOne({ _id: postMetaId });

          await answerCallback(callbackId, `✅ Post ${postMetaId} deleted`);
          // Update original Telegram message
          await fetch(`${API_URL}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `🗑 Post ${postMetaId} deleted successfully`
            })
          });
        } catch (err) {
          logger.error('Delete via Telegram failed:', err);
          await answerCallback(callbackId, `❌ Failed to delete post ${postMetaId}`);
        }
      }

      // ✅ ResolveMeta
      if (data.startsWith('resolveMeta_')) {
        const reportId = data.split('_')[1];
        await answerCallback(callbackId, `✅ Report ${reportId} resolved`);
        await fetch(`${API_URL}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `✅ Report ${reportId} marked as resolved`
          })
        });
      }

      // 🚫 Ban User
      if (data.startsWith('ban_')) {
        const userId = data.split('_')[1];
        // TODO: integrate your ban logic here
        await answerCallback(callbackId, `🚫 User ${userId} banned`);
      }
    }
  } catch (err) {
    logger.error('handleTelegramUpdate error:', err);
  }
}
