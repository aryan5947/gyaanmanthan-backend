import webpush from "web-push";
import { env } from "../config/env.js";

webpush.setVapidDetails(
  env.webpush.email,
  env.webpush.publicKey,
  env.webpush.privateKey
);

export const sendNotification = async (
  subscription: webpush.PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }
) => {
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon.png",
    url: payload.url || "/"
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload);
  } catch (err) {
    console.error("❌ Push notification failed:", err);
  }
};
