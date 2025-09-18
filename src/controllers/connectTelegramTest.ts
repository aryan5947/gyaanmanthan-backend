import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { TelegramLinkToken } from "../models/TelegramLinkToken.js";
import { TELEGRAM } from "../config/telegram.js";

export async function connectTelegramTest(req: Request, res: Response) {
  try {
    console.log("🔹 [connectTelegramTest] Route hit");
    console.log("req.user:", req.user);

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1️⃣ Secure random token
    const jti = crypto.randomBytes(16).toString("hex");

    // 2️⃣ Expiry (10 min)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 3️⃣ Save in DB with name + username
    await TelegramLinkToken.create({
      userId,
      userName: req.user.name,
      userUsername: req.user.username,
      jti,
      expiresAt,
      used: false
    });

    // 4️⃣ Deep link
    const authUrl = `https://t.me/${TELEGRAM.botUsername}?start=${encodeURIComponent(jti)}`;

    console.log(`✅ [connectTelegramTest] Link for ${req.user.username}: ${authUrl}`);

    return res.json({
      success: true,
      authUrl,
      expiresAt
    });

  } catch (err) {
    console.error("❌ [connectTelegramTest] Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
