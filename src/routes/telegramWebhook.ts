import { Router, Request, Response } from 'express';
import { handleTelegramUpdate, sendTelegramMessage } from '../utils/telegramBot.js';
import { env } from '../config/env.js';
import { TelegramUpdate } from '../types/telegram.js';

const router = Router();

function isAdminChat(chatId: number): boolean {
  const allowed = new Set(
    [env.telegram.chatId, ...env.telegram.allowedChatIds].map(String)
  );
  return allowed.has(String(chatId));
}

router.post('/telegram-webhook', async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;

  // 🔹 Handle inline button clicks (callback_query)
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    if (!isAdminChat(chatId)) return res.sendStatus(200);

    await handleTelegramUpdate(update);
    return res.sendStatus(200);
  }

  // 🔹 Handle slash commands typed in chat
  if (update.message?.text) {
    const text = update.message.text.trim();
    const chatId = update.message.chat.id;
    if (!isAdminChat(chatId)) return res.sendStatus(200);

    const [command, arg] = text.split(' ');

    switch (command) {
      case '/ban':
        await sendTelegramMessage(`🚫 Ban user: ${arg}`, chatId);
        break;
      case '/unban':
        await sendTelegramMessage(`♻️ Unban user: ${arg}`, chatId);
        break;
      case '/deletepost':
        await sendTelegramMessage(`🗑 Delete post: ${arg}`, chatId);
        break;
      case '/resolvereport':
        await sendTelegramMessage(`📌 Resolve report: ${arg}`, chatId);
        break;
      case '/resolveMeta':
        await sendTelegramMessage(`📌 Resolve meta report: ${arg}`, chatId);
        break;
      case '/stats':
        await sendTelegramMessage(`📊 Stats requested`, chatId);
        break;
      case '/help':
        await sendTelegramMessage(
          `ℹ️ Commands\n/ban <userId>\n/unban <userId>\n/deletepost <postId>\n/resolvereport <reportId>\n/resolveMeta <metaReportId>\n/stats`,
          chatId
        );
        break;
      default:
        // ignore
        break;
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

export default router;
