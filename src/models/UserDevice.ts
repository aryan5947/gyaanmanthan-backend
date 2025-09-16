// src/models/UserDevice.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IUserDevice extends Document {
  userId: Types.ObjectId;
  deviceId: string; // fingerprint or generated UUID
  deviceInfo: string; // e.g. "Chrome on Windows 11"
  ip: string;
  lastLogin: Date;
}

const userDeviceSchema = new Schema<IUserDevice>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deviceId: { type: String, required: true },
  deviceInfo: { type: String },
  ip: { type: String },
  lastLogin: { type: Date, default: Date.now }
});

userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const UserDevice = model<IUserDevice>("UserDevice", userDeviceSchema);
