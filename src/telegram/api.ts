import { env } from "../config/env.js";
import { TelegramButton } from "../types/telegram.js";
import { logger } from "./logger.js";

const API_URL = `https://api.telegram.org/bot${env.telegram.botToken}`;

export async function sendTelegramMessage(text: string, chatId?: string | number) {
  const chat_id = chatId ?? env.telegram.chatId;
  const res = await fetch(`${API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text }),
  });
  if (!res.ok) {
    logger.error("sendTelegramMessage failed:", res.status, await res.text());
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    }),
  });
  if (!res.ok) {
    logger.error("sendTelegramAlertWithButtons failed:", res.status, await res.text());
  }
}

export async function answerCallback(callbackId: string, text: string) {
  const res = await fetch(`${API_URL}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  });
  if (!res.ok) {
    logger.error("answerCallback failed:", res.status, await res.text());
  }
}

export async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  await fetch(`${API_URL}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  });
}

export async function setWebhook(url: string) {
  const res = await fetch(`${API_URL}/setWebhook?url=${encodeURIComponent(url)}`);
  logger.info("setWebhook status:", res.status);
}
