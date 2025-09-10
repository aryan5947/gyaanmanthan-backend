import { Schema, model, Document, Types } from "mongoose";

export interface IPostCopyrightMatch extends Document {
  postId: Types.ObjectId;
  refAssetId: Types.ObjectId;
  mediaType: "image" | "video" | "audio" | "text";
  confidence: number;
  engineScores?: Record<string, number>;
  decision: "violation" | "allow" | "review";
  createdAt: Date;
}

const PostCopyrightMatchSchema = new Schema<IPostCopyrightMatch>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    refAssetId: { type: Schema.Types.ObjectId, ref: "ReferenceAsset", required: true, index: true },
    mediaType: { type: String, enum: ["image", "video", "audio", "text"], required: true },
    confidence: { type: Number, required: true },
    engineScores: { type: Map, of: Number },
    decision: { type: String, enum: ["violation", "allow", "review"], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PostCopyrightMatch = model<IPostCopyrightMatch>(
  "PostCopyrightMatch",
  PostCopyrightMatchSchema
);
