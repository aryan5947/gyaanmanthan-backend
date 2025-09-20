import { Notification } from '../models/Notification.js'; // ✅ .js extension for Node16+
import mongoose from 'mongoose';

interface NotificationPayload {
  userId: mongoose.Types.ObjectId;
  type: string;
  message?: string; // optional if using structured fields
  reason?: string;
  details?: string;
  link?: string;
  relatedUser?: mongoose.Types.ObjectId;
  relatedPost?: mongoose.Types.ObjectId;
  relatedPostMeta?: mongoose.Types.ObjectId;
  relatedComment?: mongoose.Types.ObjectId; // ✅ added for comment mentions
}

export const createNotification = async ({
  userId,
  type,
  message,
  reason,
  details,
  link,
  relatedUser,
  relatedPost,
  relatedPostMeta,
  relatedComment
}: NotificationPayload): Promise<void> => {
  await Notification.create({
    userId,
    type,
    message: message || null,
    reason: reason || null,
    details: details || null,
    link: link || null,
    relatedUser: relatedUser || null,
    relatedPost: relatedPost || null,
    relatedPostMeta: relatedPostMeta || null,
    relatedComment: relatedComment || null // ✅ now supported
  });
};
