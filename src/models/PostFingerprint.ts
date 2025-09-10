import { Schema, model, Document, Types } from "mongoose";

export interface IPostFingerprint extends Document {
  postId: Types.ObjectId;
  mediaType: "image" | "video" | "audio" | "text";
  hashes: {
    phash?: string[];
    simhash?: string;
    audio?: string[];
  };
  embeddingsRef?: string;
  version: number;
  createdAt: Date;
}

const PostFingerprintSchema = new Schema<IPostFingerprint>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    mediaType: { type: String, enum: ["image", "video", "audio", "text"], required: true },
    hashes: {
      phash: [String],
      simhash: String,
      audio: [String]
    },
    embeddingsRef: { type: String },
    version: { type: Number, default: 1 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes for fast lookup
PostFingerprintSchema.index({ "hashes.phash": 1 });
PostFingerprintSchema.index({ "hashes.simhash": 1 });

export const PostFingerprint = model<IPostFingerprint>(
  "PostFingerprint",
  PostFingerprintSchema
);
