import { env } from '../config/env.js';
import { TelegramButton } from '../types/telegram.js';
import { logger } from './logger.js';

// Base API URL using new nested env
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
