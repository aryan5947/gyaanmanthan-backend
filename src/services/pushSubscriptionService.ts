import { PushSubscription } from '../models/PushSubscription'; // ✅ create this model if needed

export async function getUserPushSubscription(userId: string) {
  return await PushSubscription.findOne({ userId });
}
