import { sendTelegramAlertWithButtons, answerCallback } from "../api.js";
import { buildUserActionsButtons, buildMetaActionsButtons } from "../buttons.js"; // ✅ Meta buttons भी import
import { User } from "../../models/User.js";
import { Post } from "../../models/Post.js";
import { PostMeta } from "../../models/PostMeta.js";
import { logger } from "../logger.js";

// 🔹 User Actions Menu
export async function handleActionsMenu(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const data = update.callback_query.data as string;
  const arg = data.replace("actions_", "");

  try {
    let user: any = null;
    if (arg.startsWith("@")) {
      const uname = arg.slice(1).toLowerCase();
      user = await User.findOne({ username: uname }).lean();
    } else {
      user = await User.findById(arg).lean();
    }

    if (!user) return await answerCallback(callbackId, `❌ User not found for ${arg}`);

    await sendTelegramAlertWithButtons(
      `Actions for @${user.username}`,
      "Choose an action below:",
      buildUserActionsButtons(user),
      chatId
    );
    await answerCallback(callbackId, "📋 Actions menu sent");
  } catch (err) {
    logger.error("handleActionsMenu failed:", err);
    await answerCallback(callbackId, "❌ Failed to send actions menu");
  }
}

// 🔹 Post Owner Actions Menu
export async function handlePostOwnerMenu(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const postId = update.callback_query.data.replace("post_owner_", "");

  try {
    const post = await Post.findById(postId).select("user").lean() as any;
    if (!post) return await answerCallback(callbackId, "❌ Post not found");

    const user = await User.findById(post.user).lean() as any;
    if (!user) return await answerCallback(callbackId, "❌ Owner not found");

    await sendTelegramAlertWithButtons(
      `Actions for @${user.username}`,
      `Owner of Post ${postId}`,
      buildUserActionsButtons(user),
      chatId
    );
    await answerCallback(callbackId, "📋 Owner actions menu sent");
  } catch (err) {
    logger.error("handlePostOwnerMenu failed:", err);
    await answerCallback(callbackId, "❌ Failed to fetch owner");
  }
}

// 🔹 PostMeta Actions Menu
export async function handlePostMetaMenu(update: any) {
  const callbackId = update.callback_query.id;
  const chatId = update.callback_query.message.chat.id;
  const metaId = update.callback_query.data.replace("post_meta_", "");

  try {
    const postMeta = await PostMeta.findById(metaId).lean() as any;
    if (!postMeta) return await answerCallback(callbackId, "❌ PostMeta not found");

    const post = await Post.findById(postMeta.post).select("user").lean() as any;
    if (!post) return await answerCallback(callbackId, "❌ Parent Post not found");

    const user = await User.findById(post.user).lean() as any;
    if (!user) return await answerCallback(callbackId, "❌ Owner not found");

    // ✅ अब Meta Actions दिखेंगे
    await sendTelegramAlertWithButtons(
      `Meta Actions for Post ${post._id}`,
      `Owner: @${user.username}\nMeta ID: ${metaId}`,
      buildMetaActionsButtons(metaId, post._id),
      chatId
    );

    await answerCallback(callbackId, "📋 PostMeta actions menu sent");
  } catch (err) {
    logger.error("handlePostMetaMenu failed:", err);
    await answerCallback(callbackId, "❌ Failed to fetch PostMeta");
  }
}
