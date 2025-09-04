import { Schema, model, Document, Types } from "mongoose";

export interface IReply {
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ DP support for replies
  text: string;
  likes: number;
  createdAt: Date;
}

export interface IComment extends Document {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string; // ✅ DP support for main comment
  text: string;
  likes: number;
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String }, // ✅ schema field for reply DP
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String }, // ✅ schema field for comment DP
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    replies: [replySchema],
  },
  { timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);
