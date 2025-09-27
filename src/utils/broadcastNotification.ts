import { User } from '../models/User.js';
import { getUserPushSubscription } from '../services/pushSubscriptionService.js';
import { createNotification } from './createNotification.js';
import mongoose from 'mongoose';

interface BroadcastPayload {
  type: string;
  message: string;
  link?: string;
  reason?: string;
  details?: string;
}

export const broadcastNotification = async ({
  type,
  message,
  link,
  reason,
  details
}: BroadcastPayload): Promise<void> => {
  const users = await User.find({ isActive: true }).select("_id").lean();

  for (const user of users) {
    try {
      await createNotification({
       userId: new mongoose.Types.ObjectId(String(user._id)),
       type,
       message,
       link,
       reason,
       details
      });
    } catch (err) {
      console.warn("⚠️ Failed to notify user:", user._id.toString(), err);
    }
  }

  console.log(`✅ Broadcast complete: ${users.length} users targeted`);
};
