import { Router, Request, Response } from "express";
import {
  answerCallback,
  sendTelegramAlert,
  sendUserActionsMenu,
  sendPostActionsMenu,
} from "../utils/telegramBot.js";
import { env } from "../config/env.js";
import {
  banUser,
  deletePost,
  getSiteStats,
  resolveReport,
  resolveMetaReport,
  unbanUser,
} from "../services/adminActions.js";
import { TelegramUpdate } from "../types/telegram.js";

const router = Router();

function isAdminChat(chatId: number): boolean {
  const allowed = new Set(
    [env.telegram.chatId, ...env.telegram.allowedChatIds].map(String)
  );
  return allowed.has(String(chatId));
}

router.post("/telegram-webhook", async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;

  // 🔹 Handle inline button clicks
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message.chat.id;
    if (!isAdminChat(chatId)) return res.sendStatus(200);

    const data = cb.data || "";

    try {
      // ---------- User menu ----------
      if (data.startsWith("actions_") || data.startsWith("post_owner_")) {
        const id =
          data.startsWith("actions_")
            ? data.replace("actions_", "")
            : data.replace("post_owner_", "");
        if (data.startsWith("actions_")) {
          await sendUserActionsMenu(id, chatId);
        } else {
          await sendPostActionsMenu(id, chatId);
        }
        await answerCallback(cb.id, "📋 Actions menu sent");
        return res.sendStatus(200);
      }

      // ---------- Post actions ----------
      const [cmd, id] = data.split("_");
      switch (cmd) {
        case "resolve": {
          const r = await resolveReport(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case "resolveMeta": {
          const r = await resolveMetaReport(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case "delete": {
          const r = await deletePost(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case "ban": {
          const r = await banUser(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case "unban": {
          const r = await unbanUser(id);
          await answerCallback(cb.id, r.message);
          break;
        }
        case "stats": {
          const stats = await getSiteStats();
          await answerCallback(cb.id, stats);
          break;
        }
        default:
          await answerCallback(cb.id, "❓ Unknown action");
      }
    } catch (e: any) {
      await answerCallback(
        cb.id,
        `❌ Action failed: ${e?.message || "unexpected error"}`
      );
    }

    return res.sendStatus(200);
  }

  // 🔹 Handle slash commands typed in chat
  if (update.message?.text) {
    const text = update.message.text.trim();
    const chatId = update.message.chat.id;
    if (!isAdminChat(chatId)) return res.sendStatus(200);

    const [command, arg] = text.split(" ");

    try {
      switch (command) {
        case "/ban":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/ban <userId>");
            break;
          }
          await banUser(arg);
          await sendTelegramAlert("🚫 User Banned", `User ID: ${arg}`);
          break;

        case "/unban":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/unban <userId>");
            break;
          }
          await unbanUser(arg);
          await sendTelegramAlert("✅ User Unbanned", `User ID: ${arg}`);
          break;

        case "/deletepost":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/deletepost <postId>");
            break;
          }
          await deletePost(arg);
          await sendTelegramAlert("🗑️ Post Deleted", `Post ID: ${arg}`);
          break;

        case "/resolvereport":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/resolvereport <reportId>");
            break;
          }
          await resolveReport(arg);
          await sendTelegramAlert(
            "📌 Post Report Resolved",
            `Report ID: ${arg}`
          );
          break;

        case "/resolveMeta":
          if (!arg) {
            await sendTelegramAlert(
              "⚠️ Usage",
              "/resolveMeta <metaReportId>"
            );
            break;
          }
          await resolveMetaReport(arg);
          await sendTelegramAlert(
            "📌 PostMeta Report Resolved",
            `Meta Report ID: ${arg}`
          );
          break;

        case "/stats": {
          const stats = await getSiteStats();
          await sendTelegramAlert("📊 Site Stats", stats);
          break;
        }

        case "/menu":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/menu <userId>");
            break;
          }
          await sendUserActionsMenu(arg, chatId);
          break;

        case "/postmenu":
          if (!arg) {
            await sendTelegramAlert("⚠️ Usage", "/postmenu <postId>");
            break;
          }
          await sendPostActionsMenu(arg, chatId);
          break;

        case "/help":
          await sendTelegramAlert(
            "ℹ️ Commands",
            [
              "/ban <userId>",
              "/unban <userId>",
              "/deletepost <postId>",
              "/resolvereport <reportId>",
              "/resolveMeta <metaReportId>",
              "/stats",
              "/menu <userId>",
              "/postmenu <postId>",
              "/help",
            ].join("\n")
          );
          break;

        default:
          // ignore unknown commands
          break;
      }
    } catch (e: any) {
      await sendTelegramAlert(
        "❌ Error",
        e?.message || "Command execution failed"
      );
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

export default router;
