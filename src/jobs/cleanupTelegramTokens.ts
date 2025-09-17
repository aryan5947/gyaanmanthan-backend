import { TelegramLinkToken } from "../models/TelegramLinkToken";

export async function cleanupTelegramTokens() {
  await TelegramLinkToken.deleteMany({
    $or: [
      { used: true },
      { expiresAt: { $lt: new Date() } }
    ]
  });
}
