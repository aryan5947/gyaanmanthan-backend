import { Telegraf, Context } from "telegraf";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { TELEGRAM } from "../config/telegram";
import { TelegramLinkToken } from "../models/TelegramLinkToken";
import { User } from "../models/User";

// Extend Context to include startPayload
interface MyContext extends Context {
  startPayload?: string;
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  try {
    if (!ctx.chat) {
      await ctx.reply("⚠️ No chat context found.");
      return;
    }

    const chatId = ctx.chat.id;
    const tgUsername = ctx.from?.username || null;
    const token = (ctx.startPayload || "").trim();

    if (!token) {
      await ctx.reply("👋 Hi! Please connect from your account settings in the app for security and updates.");
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, TELEGRAM.jwtSecret);
    } catch {
      await ctx.reply("❌ Link invalid or expired. Please generate a new link from the app.");
      return;
    }

    const { uid, jti } = decoded as { uid: string; jti: string };
    if (!uid || !jti) {
      await ctx.reply("❌ Invalid link payload.");
      return;
    }

    const tokenDoc = await TelegramLinkToken.findOne({ jti });
    if (!tokenDoc) {
      await ctx.reply("❌ Link not found. Please generate again.");
      return;
    }
    if (tokenDoc.used) {
      await ctx.reply("⚠️ This link was already used. Generate a new one from the app.");
      return;
    }
    if (tokenDoc.expiresAt.getTime() < Date.now()) {
      await ctx.reply("⌛ Link expired. Please generate a new link from the app.");
      return;
    }
    if (String(tokenDoc.userId) !== uid) {
      await ctx.reply("❌ Security check failed. Generate a fresh link.");
      return;
    }

    const userId = new mongoose.Types.ObjectId(uid);

    const existing = await User.findOne({
      telegramChatId: chatId,
      _id: { $ne: userId }
    }).select("_id username");

    if (existing) {
      await ctx.reply("❌ This Telegram is already linked to another account.");
      return;
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          telegramChatId: chatId,
          telegramUsername: tgUsername,
          telegramLinkedAt: new Date()
        }
      }
    );

    await TelegramLinkToken.updateOne(
      { _id: tokenDoc._id },
      { $set: { used: true } }
    );

    await ctx.reply("✅ Telegram connected! You’ll now receive notifications here.");
  } catch (err) {
    console.error("Telegram /start error:", err);
    await ctx.reply("⚠️ Something went wrong. Please try again from the app.");
  }
});

export default bot;
