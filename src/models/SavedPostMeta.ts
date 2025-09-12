import { Schema, model, Document, Types } from "mongoose";
import { IPostMeta } from "./PostMeta"; // PostMeta interface import

export interface ISavedPostMeta extends Document {
  userId: Types.ObjectId;                     // jis user ne save kiya
  postMetaId: Types.ObjectId | IPostMeta;      // saved PostMeta ka reference ya populated object
  createdAt: Date;
  updatedAt: Date;
}

const savedPostMetaSchema = new Schema<ISavedPostMeta>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postMetaId: { type: Schema.Types.ObjectId, ref: "PostMeta", required: true, index: true }
  },
  { timestamps: true }
);

export const SavedPostMeta = model<ISavedPostMeta>("SavedPostMeta", savedPostMetaSchema);

