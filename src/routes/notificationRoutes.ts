import { Router } from "express";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notificationController";
import { sendNotification } from "../utils/webPush";
import { auth } from "../middleware/auth";
import { PushSubscription } from "../models/PushSubscription";

const router = Router();

// --- ROUTES ---

// Get notifications
router.get("/", auth, getUserNotifications);

// Mark single notification as read
router.patch("/:id/read", auth, markNotificationRead);

// Mark all notifications as read
router.patch("/read-all", auth, markAllNotificationsRead);

// ✅ Subscribe route (called from frontend)
router.post("/subscribe", auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { endpoint, keys } = req.body;

    // Save or update subscription for this user
    await PushSubscription.findOneAndUpdate(
      { userId: req.user.id },
      { endpoint, keys },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("❌ Subscription save error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
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
    const subs = await PushSubscription.find().lean();

    await Promise.all(
      subs.map((sub) => sendNotification(sub as any, payload))
    );

    res.status(200).json({ message: "Notifications sent successfully" });
  } catch (error) {
    console.error("❌ Notification error:", error);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

export default router;
