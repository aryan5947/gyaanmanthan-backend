import mongoose, { Schema, Document } from "mongoose";

export interface ITelegramLinkToken extends Document {
  userId: mongoose.Types.ObjectId;
  jti: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const TelegramLinkTokenSchema = new Schema<ITelegramLinkToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const TelegramLinkToken = mongoose.model<ITelegramLinkToken>(
  "TelegramLinkToken",
  TelegramLinkTokenSchema
);
