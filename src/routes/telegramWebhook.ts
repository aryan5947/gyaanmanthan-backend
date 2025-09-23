import { Router, Request, Response } from "express";
import { env } from "../config/env.js";
import { TelegramUpdate } from "../types/telegram.js";
import { handleTelegramUpdate } from "../telegram/updateHandler.js";
import { handleTextCommand } from "../telegram/handlers/commandHandlers.js"; // ✅ नया import

const router = Router();

function isAdminChat(chatId: number): boolean {
  const allowed = new Set(
    [env.telegram.chatId, ...env.telegram.allowedChatIds].map(String)
  );
  return allowed.has(String(chatId));
}

router.post("/telegram-webhook", async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;

  // Check if admin allowed
  const chatId =
    update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
  if (!chatId || !isAdminChat(chatId)) return res.sendStatus(200);

  try {
    if (update.message?.text) {
      // ✅ Slash/text commands (/menu, /post, /meta, /ban, /wallet, etc.)
      await handleTextCommand(update);
    } else if (update.callback_query) {
      // ✅ Inline button callbacks
      await handleTelegramUpdate(update);
    }
  } catch (err) {
    console.error("❌ Telegram webhook error:", err);
  }

  res.sendStatus(200);
});

export default router;
