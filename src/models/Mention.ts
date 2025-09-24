// src/models/Mention.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IMention extends Document {
  postMetaId?: Types.ObjectId;          // ✅ PostMeta reference
  postId?: Types.ObjectId;              // ✅ Normal Post reference
  commentId?: Types.ObjectId;           // ✅ Normal Comment reference
  postMetaCommentId?: Types.ObjectId;   // ✅ PostMetaComment reference
  mentionedUser: Types.ObjectId;
  mentionedBy: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const mentionSchema = new Schema<IMention>(
  {
    postMetaId: { type: Schema.Types.ObjectId, ref: "PostMeta" },          // ✅
    postId: { type: Schema.Types.ObjectId, ref: "Post" },                  // ✅
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },            // ✅
    postMetaCommentId: { type: Schema.Types.ObjectId, ref: "PostMetaComment" }, // ✅
    mentionedUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mentionedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export const Mention = model<IMention>("Mention", mentionSchema);
