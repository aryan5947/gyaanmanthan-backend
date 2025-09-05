import { Schema, model, Document, Types } from "mongoose";

export interface IPost extends Document {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  media: {
    url: string;
    type: "image" | "video";
  }[];
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ Profile Picture
  stats: {
    views: number;
    likes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    // ✅ Basic Info
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // JSON string ya plain text

    // ✅ Categorization
    category: { type: String, default: "General", index: true },
    tags: [{ type: String, index: true }],

    // ✅ Media (Image / Video)
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], required: true },
      },
    ],

    // ✅ Author Info
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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

export const Post = model<IPost>("Post", postSchema);
