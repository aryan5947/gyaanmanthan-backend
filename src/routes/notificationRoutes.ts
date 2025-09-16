import { Router } from "express";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notificationController";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/", auth, getUserNotifications);
router.patch("/:id/read", auth, markNotificationRead);
router.patch("/read-all", auth, markAllNotificationsRead);

export default router;
