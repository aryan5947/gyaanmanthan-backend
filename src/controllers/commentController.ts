import { Request, Response } from "express";
import { Comment } from "../models/Comment";
import { Types } from "mongoose";

// ✅ Panel admin/moderator check
const isPanelPrivileged = (role?: string) =>
  ["admin", "moderator"].includes(role || "");

// ✅ Post owner check
const isPostOwner = (reqUserId: any, postAuthorId: any) =>
  reqUserId?.toString() === postAuthorId?.toString();

// ---------------- ADD COMMENT ----------------
export const addComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role === "banned") {
      return res.status(403).json({ message: "You are not allowed to comment" });
    }

    const { text, postAuthorId } = req.body;
    const { postId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await Comment.create({
      postId,
      postAuthorId,
      authorId: req.user._id,
      authorName: req.user.name,
      authorAvatar: req.user.avatarUrl ?? undefined,
      text,
      likes: 0,
      likedBy: [],
      replies: [],
      createdAt: new Date(),
    });

    return res.status(201).json(comment);
  } catch (err: any) {
    console.error("Error adding comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- ADD REPLY ----------------
export const addReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role === "banned") {
      return res.status(403).json({ message: "You are not allowed to reply" });
    }

    const { text } = req.body;
    const { commentId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({
      authorId: req.user._id,
      authorName: req.user.name,
      authorAvatar: req.user.avatarUrl ?? undefined,
      text,
      likes: 0,
      likedBy: [],
      createdAt: new Date(),
    });

    await comment.save();
    return res.status(201).json(comment);
  } catch (err: any) {
    console.error("Error adding reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- TOGGLE LIKE COMMENT ----------------
export const toggleLikeComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const userId = req.user._id.toString();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (!Array.isArray(comment.likedBy)) {
      comment.likedBy = [];
    }

    const hasLiked = comment.likedBy.some(
      (id: Types.ObjectId) => id.toString() === userId
    );

    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(
        (id: Types.ObjectId) => id.toString() !== userId
      );
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(new Types.ObjectId(userId));
      comment.likes += 1;
    }

    await comment.save();

    return res.json({
      _id: comment._id,
      likes: comment.likes,
      likedBy: comment.likedBy,
    });
  } catch (err: any) {
    console.error("Error toggling like:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- TOGGLE LIKE REPLY ----------------
export const toggleLikeReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId, replyId } = req.params;
    const userId = req.user._id.toString();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = (comment.replies as Types.DocumentArray<any>).id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (!Array.isArray(reply.likedBy)) {
      reply.likedBy = [];
    }

    const hasLiked = reply.likedBy.some(
      (id: Types.ObjectId) => id.toString() === userId
    );

    if (hasLiked) {
      reply.likedBy = reply.likedBy.filter(
        (id: Types.ObjectId) => id.toString() !== userId
      );
      reply.likes = Math.max(0, reply.likes - 1);
    } else {
      reply.likedBy.push(new Types.ObjectId(userId));
      reply.likes += 1;
    }

    await comment.save();
    return res.json(reply);
  } catch (err: any) {
    console.error("Error toggling reply like:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- EDIT COMMENT ----------------
export const editComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const { text } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (
      comment.authorId.toString() !== req.user._id.toString() &&
      !isPanelPrivileged(req.user.role) &&
      !isPostOwner(req.user._id, comment.postAuthorId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    comment.text = text;
    await comment.save();

    return res.json(comment);
  } catch (err: any) {
    console.error("Error editing comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE COMMENT ----------------
export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (
      comment.authorId.toString() !== req.user._id.toString() &&
      !isPanelPrivileged(req.user.role) &&
      !isPostOwner(req.user._id, comment.postAuthorId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await comment.deleteOne();
    return res.json({ message: "Comment deleted" });
  } catch (err: any) {
    console.error("Error deleting comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- EDIT REPLY ----------------
export const editReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { commentId, replyId } = req.params;
    const { text } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = (comment.replies as Types.DocumentArray<any>).id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (
      reply.authorId.toString() !== req.user._id.toString() &&
      !isPanelPrivileged(req.user.role)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    reply.text = text;
    await comment.save();

    return res.json(reply);
  } catch (err: any) {
    console.error("Error editing reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE REPLY ----------------
export const deleteReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId, replyId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = (comment.replies as Types.DocumentArray<any>).id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (
      reply.authorId.toString() !== req.user._id.toString() &&
      !isPanelPrivileged(req.user.role) &&
      !isPostOwner(req.user._id, comment.postAuthorId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    reply.deleteOne();
    await comment.save();

    return res.json({ message: "Reply deleted" });
  } catch (err: any) {
    console.error("Error deleting reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET COMMENTS FOR POST ----------------
export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    return res.json(comments);
  } catch (err: any) {
    console.error("Error fetching comments:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
