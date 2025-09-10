// src/models/PostLike.ts
import { Schema, model, Document } from "mongoose";

export interface IPostLike extends Document {
  userId: string;
  postId: string;
  createdAt: Date;
}

const postLikeSchema = new Schema<IPostLike>(
  {
    userId: { type: String, required: true },
    postId: { type: String, required: true },
  },
  { timestamps: true }
);

export const PostLike = model<IPostLike>("PostLike", postLikeSchema);
