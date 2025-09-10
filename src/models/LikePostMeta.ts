// src/models/Like.ts
import { Schema, model, Document } from "mongoose";

export interface ILike extends Document {
  userId: string;
  postMetaId: string;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    userId: { type: String, required: true },
    postMetaId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Like = model<ILike>("Like", likeSchema);
