// src/utils/createNotification.ts
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

interface NotificationPayload {
  userId: mongoose.Types.ObjectId;
  type: string;
  message: string;
  relatedUser?: mongoose.Types.ObjectId;
  relatedPost?: mongoose.Types.ObjectId;
  relatedPostMeta?: mongoose.Types.ObjectId;
}

export const createNotification = async ({
  userId,
  type,
  message,
  relatedUser,
  relatedPost,
  relatedPostMeta
}: NotificationPayload): Promise<void> => {
  await Notification.create({
    userId,
    type,
    message,
    relatedUser,
    relatedPost,
    relatedPostMeta
  });
};
