import { handleActionsMenu, handlePostOwnerMenu, handlePostMetaMenu } from "./menuHandlers.js";
import * as userHandlers from "./userHandlers.js";
import * as postHandlers from "./postHandlers.js";
import * as metaHandlers from "./metaHandlers.js";
import { answerCallback, sendTelegramAlertWithButtons } from "../api.js";
import * as adHandlers from "./adHandlers.js";
import { logger } from "../logger.js";

/**
 * Slash/text commands handler
 * This will be called from webhook when update.message.text exists
 */
export async function handleTextCommand(update: any) {
  if (!update.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();
  const parts = text.split(" ");
  const command = parts[0].toLowerCase();
  const arg1 = parts[1];
  const arg2 = parts[2];

  try {
    switch (command) {
      // 🔹 Help Command
      case "/help": {
        const helpText = `
📖 *Available Commands*

👤 User:
- /menu <userId|@username>
- /ban <userId>
- /unban <userId>
- /wallet <userId> <amount>
- /role <userId> <admin|user>
- /plan <userId> <free|partner>
- /stats <userId>
- /logout <userId>

📝 Post:
- /post <postId>
- /delete <postId>
- /restore <postId>
- /resolvepost <postId>

📌 PostMeta:
- /meta <metaId>
- /resolvemeta <metaId>
- /rescore <metaId>
- /normalize <metaId>
- /flag <metaId>

📢 Ads:
- /ad <adId>
- /deletead <adId>
- /restoread <adId>
- /resolvead <adId>
- /viewad <adId> 
        `;
        return await sendTelegramAlertWithButtons("⚡ Command Reference", helpText, [], chatId);
      }

      // 🔹 Menus
      case "/menu": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /menu <userId|@username>");
        return await handleActionsMenu({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `actions_${arg1}` },
        });
      }

      case "/post": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /post <postId>");
        return await handlePostOwnerMenu({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `post_owner_${arg1}` },
        });
      }

      case "/meta": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /meta <metaId>");
        return await handlePostMetaMenu({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `post_meta_${arg1}` },
        });
      }

      // 🔹 Direct User Actions
      case "/ban": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /ban <userId>");
        return await userHandlers.handleBan({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `ban_${arg1}` },
        });
      }

      case "/unban": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /unban <userId>");
        return await userHandlers.handleUnban({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `unban_${arg1}` },
        });
      }

      case "/wallet": {
        if (!arg1 || !arg2) return await answerCallback("manual", "❌ Usage: /wallet <userId> <amount>");
        return await userHandlers.handleWalletAdd({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `wallet_add_${arg1}_${arg2}` },
        });
      }

      case "/role": {
        if (!arg1 || !arg2) return await answerCallback("manual", "❌ Usage: /role <userId> <admin|user>");
        return await userHandlers.handleRoleChange({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `role_${arg2}_${arg1}` },
        });
      }

      case "/plan": {
        if (!arg1 || !arg2) return await answerCallback("manual", "❌ Usage: /plan <userId> <free|partner>");
        return await userHandlers.handlePlanChange({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `plan_${arg2}_${arg1}` },
        });
      }

      case "/stats": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /stats <userId>");
        return await userHandlers.handleStats({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `stats_${arg1}` },
        });
      }

      case "/logout": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /logout <userId>");
        return await userHandlers.handleLogout({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `logout_${arg1}` },
        });
      }

      // 🔹 Direct Post Actions
      case "/delete": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /delete <postId>");
        return await postHandlers.handleDelete({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `delete_${arg1}` },
        });
      }

      case "/restore": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /restore <postId>");
        return await postHandlers.handleRestore({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `restore_${arg1}` },
        });
      }

      case "/resolvepost": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /resolvepost <postId>");
        return await postHandlers.handleResolvePost({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `resolvePost_${arg1}` },
        });
      }

      case "/resolvemeta": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /resolvemeta <metaId>");
        return await postHandlers.handleResolveMeta({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `resolveMeta_${arg1}` },
        });
      }

      // 🔹 Direct Meta Actions
      case "/rescore": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /rescore <metaId>");
        return await metaHandlers.handleRescore({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `rescore_${arg1}` },
        });
      }

      case "/normalize": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /normalize <metaId>");
        return await metaHandlers.handleNormalize({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `normalize_${arg1}` },
        });
      }

      case "/flag": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /flag <metaId>");
        return await metaHandlers.handleFlag({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `flag_${arg1}` },
        });
      }

      // 🔹 Ads Commands
      case "/ad": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /ad <adId>");
        return await adHandlers.handleAdMenu({
         callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `ad_${arg1}` },
        });
      }

      case "/deletead": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /deletead <adId>");
        return await adHandlers.handleDeleteAd({
         callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `deleteAd_${arg1}` },
        });
      }

      case "/restoread": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /restoread <adId>");
        return await adHandlers.handleRestoreAd({
         callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `restoreAd_${arg1}` },
        });
      }

      case "/resolvead": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /resolvead <adId>");
        return await adHandlers.handleResolveAd({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `resolveAd_${arg1}` },
        });
      }

      case "/viewad": {
        if (!arg1) return await answerCallback("manual", "❌ Usage: /viewad <adId>");
        return await adHandlers.handleViewAd({
          callback_query: { id: "manual", message: { chat: { id: chatId } }, data: `viewAd_${arg1}` },
        });
      }

      default:
        return await answerCallback("manual", `❓ Unknown command: ${command}`);
    }
  } catch (err) {
    logger.error("handleTextCommand failed:", err);
    return await answerCallback("manual", "❌ Failed to handle command");
  }
}
