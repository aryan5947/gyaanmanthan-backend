import { TelegramButton } from "../types/telegram.js";

// 🔹 User Actions Buttons
export function buildUserActionsButtons(user: any): TelegramButton[][] {
  return [
    [
      {
        text: user.role === "banned" ? "♻️ Unban" : "🚫 Ban",
        callback_data: `${user.role === "banned" ? "unban" : "ban"}_${user._id}`,
      },
      {
        text: user.isGoldenVerified ? "❌ Remove Tick" : "🏅 Give Tick",
        callback_data: `toggle_golden_${user._id}`,
      },
    ],
    [
      { text: "🏅 Auto Tick", callback_data: `auto_golden_${user._id}` },
      { text: "💰 +₹100", callback_data: `wallet_add_${user._id}_100` },
    ],
    [
      { text: "🎭 Make Admin", callback_data: `role_admin_${user._id}` },
      { text: "🎭 Make User", callback_data: `role_user_${user._id}` },
    ],
    [
      { text: "📦 Partner Plan", callback_data: `plan_partner_${user._id}` },
      { text: "📦 Free Plan", callback_data: `plan_free_${user._id}` },
    ],
    [
      { text: "📊 Stats", callback_data: `stats_${user._id}` },
      { text: "🔐 Logout", callback_data: `logout_${user._id}` },
    ],
  ];
}

// 🔹 Post Actions Buttons
export function buildPostActionsButtons(postId: string, ownerId?: string): TelegramButton[][] {
  return [
    [
      { text: "🗑 Delete Post", callback_data: `delete_${postId}` },
      { text: "♻️ Restore Post", callback_data: `restore_${postId}` },
    ],
    [
      {
        text: "👤 User Actions",
        callback_data: ownerId ? `actions_${ownerId}` : `post_owner_${postId}`,
      },
      { text: "🔗 View Post", callback_data: `view_${postId}` },
    ],
    [
      { text: "✅ Resolve Post", callback_data: `resolvePost_${postId}` },
      { text: "📝 Resolve Report", callback_data: `resolveMeta_${postId}` },
    ],
  ];
}

// 🔹 PostMeta Actions Buttons
export function buildMetaActionsButtons(metaId: string, postId?: string): TelegramButton[][] {
  return [
    [
      { text: "📝 Resolve Meta", callback_data: `resolveMeta_${metaId}` },
      { text: "♻️ Re‑score", callback_data: `rescore_${metaId}` },
    ],
    [
      { text: "🧹 Normalize Tags", callback_data: `normalize_${metaId}` },
      { text: "🚩 Flag Meta", callback_data: `flag_${metaId}` },
    ],
    [
      {
        text: "👤 Owner Actions",
        callback_data: postId ? `post_owner_${postId}` : `meta_owner_${metaId}`,
      },
      { text: "🔗 View Post", callback_data: postId ? `view_${postId}` : `viewMeta_${metaId}` },
    ],
  ];
}

// 🔹 Ad Actions Buttons
export function buildAdActionsButtons(adId: string): TelegramButton[][] {
  return [
    [
      { text: "🗑 Delete Ad", callback_data: `deleteAd_${adId}` },
      { text: "♻️ Restore Ad", callback_data: `restoreAd_${adId}` },
    ],
    [
      { text: "✅ Resolve Ad", callback_data: `resolveAd_${adId}` },
      { text: "🔗 View Ad", callback_data: `viewAd_${adId}` },
    ],
  ];
}
