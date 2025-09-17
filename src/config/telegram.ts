export const TELEGRAM = {
  botUsername: process.env.TELEGRAM_BOT_USERNAME!, // e.g., MyAppBot (no @)
  jwtSecret: process.env.TELEGRAM_LINK_JWT_SECRET!, // strong secret
  tokenTtlSec: 600 // 10 minutes
};
