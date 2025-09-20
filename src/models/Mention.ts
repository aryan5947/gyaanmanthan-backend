// src/models/Mention.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IMention extends Document {
  postId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  mentionedUser: Types.ObjectId;
  mentionedBy: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const mentionSchema = new Schema<IMention>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    mentionedUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mentionedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export const Mention = model<IMention>("Mention", mentionSchema);
