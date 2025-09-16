import { Request, Response } from "express";
import { Notification } from "../models/Notification";
import mongoose from "mongoose";

// GET /api/notifications
export async function getUserNotifications(req: Request, res: Response) {
  if (!req.user?._id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ ok: true, notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch notifications" });
  }
}

// PATCH /api/notifications/:id/read
export async function markNotificationRead(req: Request, res: Response) {
  const { id } = req.params;
  if (!req.user?._id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ ok: false, message: "Invalid notification ID" });
  }

  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!updated) return res.status(404).json({ ok: false, message: "Notification not found" });

    return res.json({ ok: true, notification: updated });
  } catch (err) {
    console.error("Error marking notification read:", err);
    return res.status(500).json({ ok: false, message: "Failed to update notification" });
  }
}

// PATCH /api/notifications/read-all
export async function markAllNotificationsRead(req: Request, res: Response) {
  if (!req.user?._id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ ok: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications read:", err);
    return res.status(500).json({ ok: false, message: "Failed to update notifications" });
  }
}
