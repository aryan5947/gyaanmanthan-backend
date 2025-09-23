import { handleActionsMenu, handlePostOwnerMenu, handlePostMetaMenu } from "./handlers/menuHandlers.js";
import * as userHandlers from "./handlers/userHandlers.js";
import * as postHandlers from "./handlers/postHandlers.js";
import * as metaHandlers from "./handlers/metaHandlers.js";   // ✅ नया Meta Handlers import
import { answerCallback } from "./api.js";
import { logger } from "./logger.js";

export async function handleTelegramUpdate(update: any) {
  if (!update.callback_query) return;
  const cb = update.callback_query;
  const data = cb.data as string;

  const routes: { [key: string]: Function } = {
    // 🔹 User & Owner Menus
    "actions_": handleActionsMenu,
    "post_owner_": handlePostOwnerMenu,
    "post_meta_": handlePostMetaMenu,   // ✅ Meta Menu route

    // 🔹 User Handlers
    "ban_": userHandlers.handleBan,
    "unban_": userHandlers.handleUnban,
    "toggle_golden_": userHandlers.handleToggleGolden,
    "auto_golden_": userHandlers.handleAutoGolden,
    "wallet_add_": userHandlers.handleWalletAdd,
    "role_": userHandlers.handleRoleChange,
    "plan_": userHandlers.handlePlanChange,
    "stats_": userHandlers.handleStats,
    "logout_": userHandlers.handleLogout,

    // 🔹 Post Handlers
    "delete_": postHandlers.handleDelete,
    "restore_": postHandlers.handleRestore,
    "resolveMeta_": postHandlers.handleResolveMeta,
    "resolvePost_": postHandlers.handleResolvePost,
    "view_": postHandlers.handleViewPost,

    // 🔹 PostMeta Handlers (नए वाले)
    "rescore_": metaHandlers.handleRescore,
    "normalize_": metaHandlers.handleNormalize,
    "flag_": metaHandlers.handleFlag,
  };

  try {
    for (const prefix in routes) {
      if (data.startsWith(prefix)) {
        return await routes[prefix](update);
      }
    }
    // ❓ अगर unknown prefix हो
    await answerCallback(cb.id, `❓ Unknown action: ${data}`);
  } catch (err) {
    logger.error("handleTelegramUpdate failed:", err);
    await answerCallback(cb.id, "❌ Failed to handle action");
  }
}
