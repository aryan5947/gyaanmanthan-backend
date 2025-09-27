import { Request, Response } from "express";
import { Notification } from "../models/Notification.js"; // ✅ Node16+
import mongoose from "mongoose";
import { createNotification } from "../utils/createNotification.js"; // ✅ push + DB helper

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

// POST /api/notifications/push
export async function pushNotification(req: Request, res: Response) {
  if (!req.user?._id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const { type, message, link, reason, details } = req.body;

  try {
    await createNotification({
      userId: req.user._id,
      type,
      message,
      reason,
      details,
      link
    });

    return res.status(201).json({ ok: true, message: "Notification created and pushed" });
  } catch (err) {
    console.error("Error creating/pushing notification:", err);
    return res.status(500).json({ ok: false, message: "Failed to push notification" });
  }
}
