import { Schema, model, Document, Types } from "mongoose";
import { User } from "./User"; // ✅ User model import for count updates

export interface IPost extends Document {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  images: string[];
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

//
// 📊 Auto‑increment/decrement User.postsCount
//
postSchema.post("save", async function (doc) {
  try {
    await User.findByIdAndUpdate(doc.authorId, { $inc: { postsCount: 1 } });
  } catch (err) {
    console.error("Error incrementing postsCount:", err);
  }
});

postSchema.post("findOneAndDelete", async function (doc: IPost | null) {
  if (!doc) return;
  try {
    await User.findByIdAndUpdate(doc.authorId, { $inc: { postsCount: -1 } });
  } catch (err) {
    console.error("Error decrementing postsCount:", err);
  }
});

export const Post = model<IPost>("Post", postSchema);
