import { Schema, model, Document, Types } from "mongoose";
import { IPost } from "./Post"; // Post interface import

export interface ISavedPost extends Document {
  userId: Types.ObjectId;              // jis user ne save kiya
  postId: Types.ObjectId | IPost;       // saved Post ka reference ya populated object
  createdAt: Date;
  updatedAt: Date;
}

const savedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true }
  },
  { timestamps: true }
);

export const SavedPost = model<ISavedPost>("SavedPost", savedPostSchema);
