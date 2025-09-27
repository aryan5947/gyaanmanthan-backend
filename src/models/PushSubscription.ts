// models/PushSubscription.ts
import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
}, { timestamps: true });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
