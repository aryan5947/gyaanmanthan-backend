import { Schema, model, Document, Types } from "mongoose";

export interface IReply {
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  text: string;
  likes: number;
  likedBy: Types.ObjectId[];
  createdAt: Date;
}

export interface IPostMetaComment extends Document {
  postMetaId: Types.ObjectId;       // 🔄 Changed from postId → postMetaId
  postAuthorId: Types.ObjectId;     // ✅ For post owner admin check
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  text: string;
  likes: number;
  likedBy: Types.ObjectId[];
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const postMetaCommentSchema = new Schema<IPostMetaComment>(
  {
    postMetaId: { type: Schema.Types.ObjectId, ref: "PostMeta", required: true, index: true }, // 🔄
    postAuthorId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // ✅
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replies: [replySchema],
  },
  { timestamps: true }
);

export const PostMetaComment = model<IPostMetaComment>(
  "PostMetaComment",
  postMetaCommentSchema
);
