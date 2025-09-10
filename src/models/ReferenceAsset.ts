import { Schema, model, Document, Types } from "mongoose";

export interface IReferenceAsset extends Document {
  ownerId: Types.ObjectId; // Asset ka owner (User ya Organization)
  title?: string;          // Optional descriptive title
  description?: string;    // Optional description
  mediaType: "image" | "video" | "audio" | "text";
  hashes: {
    phash?: string[];
    simhash?: string;
    audio?: string[];
  };
  embeddingsRef?: string;  // Optional vector DB reference
  policy: "block" | "track" | "allow"; // Enforcement policy
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceAssetSchema = new Schema<IReferenceAsset>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    mediaType: { type: String, enum: ["image", "video", "audio", "text"], required: true },

    hashes: {
      phash: [String],
      simhash: String,
      audio: [String]
    },

    embeddingsRef: { type: String },

    policy: {
      type: String,
      enum: ["block", "track", "allow"],
      default: "block",
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for fast candidate retrieval
ReferenceAssetSchema.index({ "hashes.phash": 1 });
ReferenceAssetSchema.index({ "hashes.simhash": 1 });

export const ReferenceAsset = model<IReferenceAsset>(
  "ReferenceAsset",
  ReferenceAssetSchema
);
