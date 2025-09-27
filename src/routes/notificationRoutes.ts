import { Router } from "express";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notificationController";
import { sendNotification } from "../utils/webPush";
import { auth } from "../middleware/auth";

const router = Router();

// In-memory store (replace with DB later)
const subscriptions: any[] = [];

router.get("/", auth, getUserNotifications);
router.patch("/:id/read", auth, markNotificationRead);
router.patch("/read-all", auth, markAllNotificationsRead);

// ✅ Subscribe route (called from frontend)
router.post("/subscribe", auth, (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ message: "Subscribed successfully" });
});

// ✅ Send notification (admin-only trigger)
router.post("/send", auth, async (req, res) => {
  const payload = {
    title: "📢 BPSC AEDO Recruitment",
    body: "935 posts – Apply now!",
    icon: "/icon.png",
    url: "https://gyaanmanthan.in/bpsc-aedo-form"
  };

  try {
    await Promise.all(subscriptions.map(sub => sendNotification(sub, payload)));
    res.status(200).json({ message: "Notifications sent successfully" });
  } catch (error) {
    console.error("❌ Notification error:", error);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

export default router;
