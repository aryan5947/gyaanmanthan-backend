import { Request, Response } from "express";
import { Types } from "mongoose";
import { Mention } from "../models/Mention.js"; // ✅ add .js extension
import { createNotification } from "../utils/createNotification.js"; // ✅ add .js extension

// ✅ Create mention (called from post/comment/postMeta/postMetaComment save logic)
export async function createMentions({
  text,
  postId,
  commentId,
  postMetaId,
  postMetaCommentId,
  mentionedBy
}: {
  text: string;
  postId?: string;
  commentId?: string;
  postMetaId?: string;
  postMetaCommentId?: string;
  mentionedBy: string;
}) {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(regex);
  if (!matches) return;

  // ✅ dynamic import with .js extension
  const { User } = await import("../models/User.js");

  for (const raw of matches) {
    const username = raw.slice(1).toLowerCase();
    const user = await User.findOne({ username }).select("_id");
    if (!user) continue;

    await Mention.create({
      postId,
      commentId,
      postMetaId,
      postMetaCommentId, // ✅ new field
      mentionedUser: user._id,
      mentionedBy,
    });

    // 🔔 Send notification with ObjectId cast
    await createNotification({
      userId: user._id as Types.ObjectId,
      type: "mention",
      message: `You were mentioned in a ${
        postId
          ? "post"
          : commentId
          ? "comment"
          : postMetaCommentId
          ? "postMeta comment"
          : "postMeta"
      }`,
      relatedPost: postId ? new Types.ObjectId(postId) : undefined,
      relatedComment: commentId ? new Types.ObjectId(commentId) : undefined,
      relatedPostMeta: postMetaId ? new Types.ObjectId(postMetaId) : undefined,
      relatedPostMetaComment: postMetaCommentId
        ? new Types.ObjectId(postMetaCommentId)
        : undefined,
    });
  }
}

// ✅ Accept mention
export async function acceptMention(req: Request, res: Response) {
  const { id } = req.params;
  const mention = await Mention.findOneAndUpdate(
    { _id: id, mentionedUser: req.user!.id },
    { status: "accepted" },
    { new: true }
  );
  if (!mention) return res.status(404).json({ error: "Mention not found" });
  res.json({ message: "Mention accepted", mention });
}

// ✅ Reject mention
export async function rejectMention(req: Request, res: Response) {
  const { id } = req.params;
  const mention = await Mention.findOneAndUpdate(
    { _id: id, mentionedUser: req.user!.id },
    { status: "rejected" },
    { new: true }
  );
  if (!mention) return res.status(404).json({ error: "Mention not found" });
  res.json({ message: "Mention rejected", mention });
}

// ✅ Get accepted mentions for profile
export async function getAcceptedMentions(req: Request, res: Response) {
  const userId = req.params.userId;
  const mentions = await Mention.find({ mentionedUser: userId, status: "accepted" })
    .populate("mentionedBy", "username avatarUrl")
    .populate("postId", "content")
    .populate("commentId", "content")
    .populate("postMetaId", "content")
    .populate("postMetaCommentId", "content") // ✅ populate new field
    .sort({ createdAt: -1 });

  res.json(mentions);
}
