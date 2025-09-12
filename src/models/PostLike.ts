import { Schema, model, Document, Types } from "mongoose";
import { IPost } from "./Post"; // Post interface import

export interface IPostLike extends Document {
  userId: Types.ObjectId;               // jis user ne like kiya
  postId: Types.ObjectId | IPost;        // liked Post ka reference ya populated object
  createdAt: Date;
  updatedAt: Date;
}

const postLikeSchema = new Schema<IPostLike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true }
  },
  { timestamps: true }
);

export const PostLike = model<IPostLike>("PostLike", postLikeSchema);
