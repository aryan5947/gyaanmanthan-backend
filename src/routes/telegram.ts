import { Router } from "express";
import { createTelegramConnectLink, unlinkTelegram } from "../controllers/telegramController";
import { auth } from "../middleware/auth"; // ✅ auth middleware import

const router = Router();

// ✅ Only authenticated users can connect/unlink Telegram
router.post("/connect-link", auth, createTelegramConnectLink);
router.post("/unlink", auth, unlinkTelegram);

export default router;
