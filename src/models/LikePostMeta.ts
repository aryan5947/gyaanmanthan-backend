import { Schema, model, Document, Types } from "mongoose";
import { IPostMeta } from "./PostMeta"; // PostMeta interface import

export interface ILike extends Document {
  userId: Types.ObjectId;                  // jis user ne like kiya
  postMetaId: Types.ObjectId | IPostMeta;   // liked PostMeta ka reference ya populated object
  createdAt: Date;
  updatedAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postMetaId: { type: Schema.Types.ObjectId, ref: "PostMeta", required: true, index: true }
  },
  { timestamps: true }
);

export const Like = model<ILike>("Like", likeSchema);
