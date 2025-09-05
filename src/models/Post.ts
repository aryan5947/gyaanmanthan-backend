import { Schema, model, Document, Types } from "mongoose";

export interface IPost extends Document {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  images: string[];
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ DP bhi store karenge
  stats: {
    views: number;
    likes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // can be JSON string or plain text
    category: { type: String, default: "General", index: true },
    tags: [{ type: String, index: true }],
    images: [{ type: String }],

    // ✅ Author Info
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true }, // store name for quick access
    authorAvatar: { type: String }, // ✅ DP bhi save hoga

    // ✅ Stats
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Post = model<IPost>("Post", postSchema);
