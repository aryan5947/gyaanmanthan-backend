import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { TELEGRAM } from "../config/telegram.js"; // ✅ explicit .js extension
import { TelegramLinkToken } from "../models/TelegramLinkToken.js"; // ✅ explicit .js extension

export async function createTelegramConnectLink(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const jti = randomUUID();

  const payload = { uid: String(userId), jti };
  const token = jwt.sign(payload, TELEGRAM.jwtSecret, {
    expiresIn: TELEGRAM.tokenTtlSec
  });

  const expiresAt = new Date(Date.now() + TELEGRAM.tokenTtlSec * 1000);
  await TelegramLinkToken.create({ userId, jti, expiresAt, used: false });

  const link = `https://t.me/${TELEGRAM.botUsername}?start=${encodeURIComponent(token)}`;

  return res.json({ ok: true, link, expiresAt });
}

export async function unlinkTelegram(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);

  // Safe unlink — explicit .js extension for Node16/ESM
  const { User } = await import("../models/User.js");

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null
      }
    }
  );

  return res.json({ ok: true, message: "Telegram disconnected" });
}
