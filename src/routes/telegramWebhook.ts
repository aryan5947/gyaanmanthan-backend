import { Router, Request, Response } from "express";
import { env } from "../config/env.js";
import { TelegramUpdate } from "../types/telegram.js";
import { handleTelegramUpdate } from "../telegram/updateHandler.js";

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
  const chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
  if (!chatId || !isAdminChat(chatId)) return res.sendStatus(200);

  try {
    await handleTelegramUpdate(update); // 🔹 forward to dispatcher
  } catch (err) {
    console.error("❌ Telegram webhook error:", err);
  }

  res.sendStatus(200);
});

export default router;
