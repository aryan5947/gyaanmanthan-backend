import { Notification } from '../models/Notification.js'; // ✅ .js extension for Node16+
import mongoose from 'mongoose';
import { sendNotification } from '../utils/webPush.js'; // ✅ push helper
import { getUserPushSubscription } from '../services/pushSubscriptionService.js'; // ✅ optional DB fetch

interface NotificationPayload {
  userId: mongoose.Types.ObjectId;
  type: string;
  message?: string;
  reason?: string;
  details?: string;
  link?: string;
  relatedUser?: mongoose.Types.ObjectId;
  relatedPost?: mongoose.Types.ObjectId;
  relatedPostMeta?: mongoose.Types.ObjectId;
  relatedComment?: mongoose.Types.ObjectId;
  relatedPostMetaComment?: mongoose.Types.ObjectId;
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
  relatedComment,
  relatedPostMetaComment
}: NotificationPayload): Promise<void> => {
  // ✅ Step 1: Save to DB
  const notification = await Notification.create({
    userId,
    type,
    message: message || null,
    reason: reason || null,
    details: details || null,
    link: link || null,
    relatedUser: relatedUser || null,
    relatedPost: relatedPost || null,
    relatedPostMeta: relatedPostMeta || null,
    relatedComment: relatedComment || null,
    relatedPostMetaComment: relatedPostMetaComment || null
  });

  // ✅ Step 2: Semantic icon mapping
  const iconMap: Record<string, string> = {
    mention: "/icons/mention.png",
    reply: "/icons/reply.png",
    form: "/icons/form.png",
    postmeta: "/icons/postmeta.png",
    comment: "/icons/comment.png",
    post: "/icons/post.png", // ✅ added
    postmetacomment: "/icons/postmetacomment.png" // ✅ added
  };
  const iconPath = iconMap[type] || "/icons/default.png";

  // ✅ Step 3: Fetch push subscription
  const subscription = await getUserPushSubscription(userId.toString());

  // ✅ Step 4: Trigger push only if keys are valid
  if (
    subscription &&
    subscription.endpoint &&
    subscription.keys &&
    subscription.keys.p256dh &&
    subscription.keys.auth
  ) {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      {
        title: "🔔 New Notification",
        body: message || type,
        icon: iconPath,
        url: link || "/notifications"
      }
    );
  } else {
    console.warn("⚠️ Push skipped for user:", userId.toString(), "type:", type);
  }
};
