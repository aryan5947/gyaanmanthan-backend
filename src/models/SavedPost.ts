// src/models/SavedPost.ts
import { Schema, model, Document } from "mongoose";

export interface ISavedPost extends Document {
  userId: string;
  postId: string;
  createdAt: Date;
}

const savedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: String, required: true },
    postId: { type: String, required: true },
  },
  { timestamps: true }
);

export const SavedPost = model<ISavedPost>("SavedPost", savedPostSchema);
