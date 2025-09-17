import { Notification } from '../models/Notification';
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
  relatedPostMeta
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
    relatedPostMeta: relatedPostMeta || null
  });
};
