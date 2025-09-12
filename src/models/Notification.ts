// src/models/Notification.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId; // jis user ke liye notification hai
  type: string;           // e.g. 'like', 'comment', 'follow', 'system'
  message: string;        // display text
  relatedUser?: Types.ObjectId; // jisne action kiya
  relatedPost?: Types.ObjectId; // optional: post id
  relatedPostMeta?: Types.ObjectId; // optional: postMeta id
  isRead: boolean;        // read/unread flag
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    relatedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedPost: { type: Schema.Types.ObjectId, ref: 'Post' },
    relatedPostMeta: { type: Schema.Types.ObjectId, ref: 'PostMeta' },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', notificationSchema);
