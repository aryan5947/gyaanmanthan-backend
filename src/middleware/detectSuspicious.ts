import { Request, Response, NextFunction } from 'express';
import { sendTelegramAlert } from '../utils/telegramBot.js';

export function detectSuspicious(req: Request, _res: Response, next: NextFunction) {
  try {
    const bodyStr = JSON.stringify(req.body || {});
    const hit = /(spam|viagra|casino|http:\/\/|https:\/\/)/i.test(bodyStr);
    if (hit) {
      const userId = (req as any).user?.id ?? 'Guest';
      sendTelegramAlert('⚠️ Suspicious Activity', `User: ${userId}\nPath: ${req.path}`);
    }
  } catch {}
  next();
}
