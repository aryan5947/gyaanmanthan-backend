import { Schema, model, Document, Types } from "mongoose";

export interface IPostMeta extends Document {
  title: string;
  description: string;
  category: string;
  tags: string[];
  files: {
    url: string;       // File ka path ya CDN URL
    type: string;      // "image", "video", "pdf", etc.
    name?: string;     // Original file name (optional)
    size?: number;     // Bytes me size (optional)
  }[];
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  stats: {
    views: number;
    likes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postMetaSchema = new Schema<IPostMeta>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: "General", index: true },
    tags: [{ type: String, index: true }],

    // ✅ Files array (multiple images/videos/docs allowed)
    files: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true }, // e.g. "image", "video", "pdf"
        name: { type: String },
        size: { type: Number },
      },
    ],

    // ✅ Author Info
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },

    // ✅ Stats
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const PostMeta = model<IPostMeta>("PostMeta", postMetaSchema);
