import { Router, Request, Response } from 'express';
import { answerCallback, sendTelegramAlert } from '../utils/telegramBot.js';
import { env } from '../config/env.js';
import {
  banUser,
  deletePost,
  getSiteStats,
  resolveReport,
  resolveMetaReport,
  unbanUser
} from '../services/adminActions.js';
import { TelegramUpdate } from '../types/telegram.js';

const router = Router();

function isAdminChat(chatId: number): boolean {
  const allowed = new Set([
    env.telegram.chatId,
    ...env.telegram.allowedChatIds
  ].map(String));

  return allowed.has(String(chatId));
}

router.post('/telegram-webhook', async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;

  // 🔹 Handle inline button clicks
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message.chat.id;
    if (!isAdminChat(chatId)) return res.sendStatus(200);

    const data = cb.data || '';
    const [cmd, id] = data.split('_');

    try {
      switch (cmd) {
        case 'resolve': {
          const r = await resolveReport(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case 'resolveMeta': {
          const r = await resolveMetaReport(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case 'delete': {
          const r = await deletePost(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case 'ban': {
          const r = await banUser(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case 'unban': {
          const r = await unbanUser(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case 'stats': {
          const stats = await getSiteStats();
          await answerCallback(cb.id, stats);
          break;
        }
        default:
          await answerCallback(cb.id, 'Unknown action ❓');
      }
    } catch (e: any) {
      await answerCallback(cb.id, `Action failed: ${e?.message || 'error'}`);
    }

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
        await banUser(arg);
        await sendTelegramAlert('🚫 User Banned', `User ID: ${arg}`);
        break;
      case '/unban':
        await unbanUser(arg);
        await sendTelegramAlert('✅ User Unbanned', `User ID: ${arg}`);
        break;
      case '/deletepost':
        await deletePost(arg);
        await sendTelegramAlert('🗑️ Post Deleted', `Post ID: ${arg}`);
        break;
      case '/resolvereport':
        await resolveReport(arg);
        await sendTelegramAlert('📌 Post Report Resolved', `Report ID: ${arg}`);
        break;
      case '/resolveMeta':
        await resolveMetaReport(arg);
        await sendTelegramAlert('📌 PostMeta Report Resolved', `Meta Report ID: ${arg}`);
        break;
      case '/stats': {
        const stats = await getSiteStats();
        await sendTelegramAlert('📊 Site Stats', stats);
        break;
      }
      case '/help':
        await sendTelegramAlert(
          'ℹ️ Commands',
          '/ban <userId>\n/unban <userId>\n/deletepost <postId>\n/resolvereport <reportId>\n/resolveMeta <metaReportId>\n/stats'
        );
        break;
      default:
        // ignore others
        break;
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

export default router;
