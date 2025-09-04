import { Schema, model, Document, Types } from "mongoose";

// ---------------- INTERFACES ----------------
export interface IReply {
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ DP support for replies
  text: string;
  likes: number;
  likedBy: Types.ObjectId[]; // ✅ track who liked the reply
  createdAt: Date;
}

export interface IComment extends Document {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ DP support for main comment
  text: string;
  likes: number;
  likedBy: Types.ObjectId[]; // ✅ track who liked the comment
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------- REPLY SCHEMA ----------------
const replySchema = new Schema<IReply>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ], // ✅ default empty array
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ---------------- COMMENT SCHEMA ----------------
const commentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ], // ✅ default empty array
    replies: [replySchema],
  },
  { timestamps: true }
);

// ---------------- COMPOUND INDEX FOR FASTER QUERIES ----------------
commentSchema.index({ postId: 1, createdAt: -1 });

// ---------------- MODEL EXPORT ----------------
export const Comment = model<IComment>("Comment", commentSchema);
