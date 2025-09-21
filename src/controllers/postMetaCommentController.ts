import { Request, Response } from "express";
import { PostMeta } from "../models/PostMeta";
import { PostMetaComment } from '../models/postMetaComment';
import { Types } from "mongoose";

// ✅ PostMeta owner check
const isPostMetaOwner = (reqUserId: any, postMetaAuthorId: any) =>
  reqUserId?.toString() === postMetaAuthorId?.toString();

// ---------------- ADD COMMENT ----------------
export const addMetaComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role === "banned") {
      return res.status(403).json({ message: "You are not allowed to comment" });
    }

    const { text, postMetaAuthorId } = req.body;
    const { postMetaId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await PostMetaComment.create({
      postMetaId,
      postAuthorId: postMetaAuthorId,
      authorId: req.user._id,
      authorName: req.user.name,
      authorAvatar: req.user.avatarUrl ?? undefined,
      text,
      likes: 0,
      likedBy: [],
      replies: [],
    });

    // ✅ increment commentCount on parent PostMeta
    await PostMeta.findByIdAndUpdate(postMetaId, {
      $inc: { commentCount: 1 },
    });

    return res.status(201).json(comment);
  } catch (err: any) {
    console.error("Error adding meta comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- ADD REPLY ----------------
export const addMetaReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role === "banned") {
      return res.status(403).json({ message: "You are not allowed to reply" });
    }

    const { text } = req.body;
    const { commentId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await PostMetaComment.findById(commentId);
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

    // ✅ agar replies ko bhi count me lena hai
    await PostMeta.findByIdAndUpdate(comment.postMetaId, {
      $inc: { commentCount: 1 },
    });

    return res.status(201).json(comment);
  } catch (err: any) {
    console.error("Error adding meta reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- TOGGLE LIKE COMMENT ----------------
export const toggleLikeMetaComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const userId = req.user._id.toString();

    const comment = await PostMetaComment.findById(commentId);
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
    console.error("Error toggling meta comment like:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- TOGGLE LIKE REPLY ----------------
export const toggleLikeMetaReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId, replyId } = req.params;
    const userId = req.user._id.toString();

    const comment = await PostMetaComment.findById(commentId);
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
    console.error("Error toggling meta reply like:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- EDIT COMMENT ----------------
export const editMetaComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const { text } = req.body;

    const comment = await PostMetaComment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // ✅ Only Comment Owner OR Admin can edit
    if (
      comment.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    comment.text = text;
    await comment.save();

    return res.json(comment);
  } catch (err: any) {
    console.error("Error editing meta comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE COMMENT ----------------
export const deleteMetaComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId } = req.params;
    const comment = await PostMetaComment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // ✅ Owner OR Admin OR PostMeta Owner can delete
    if (
      comment.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin" &&
      !isPostMetaOwner(req.user._id, comment.postAuthorId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ✅ delete comment
    await comment.deleteOne();

    // ✅ decrement commentCount on parent PostMeta
    await PostMeta.findByIdAndUpdate(comment.postMetaId, {
      $inc: { commentCount: -1 },
    });

    return res.json({ message: "Meta comment deleted" });
  } catch (err: any) {
    console.error("Error deleting meta comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- EDIT REPLY ----------------
export const editMetaReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId, replyId } = req.params;
    const { text } = req.body;

    const comment = await PostMetaComment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = (comment.replies as Types.DocumentArray<any>).id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    // ✅ Only Reply Owner OR Admin can edit
    if (
      reply.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    reply.text = text;
    await comment.save();

    return res.json(reply);
  } catch (err: any) {
    console.error("Error editing meta reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE REPLY ----------------
export const deleteMetaReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { commentId, replyId } = req.params;

    const comment = await PostMetaComment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = (comment.replies as Types.DocumentArray<any>).id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    // ✅ Owner OR Admin OR PostMeta Owner can delete
    if (
      reply.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin" &&
      !isPostMetaOwner(req.user._id, comment.postAuthorId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    reply.deleteOne();
    await comment.save();

    // ✅ decrement commentCount on parent PostMeta
    await PostMeta.findByIdAndUpdate(comment.postMetaId, {
      $inc: { commentCount: -1 },
    });

    return res.json({ message: "Meta reply deleted" });
  } catch (err: any) {
    console.error("Error deleting meta reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET COMMENTS FOR POSTMETA ----------------
export const getCommentsByPostMeta = async (req: Request, res: Response) => {
  try {
    const { postMetaId } = req.params;
    const comments = await PostMetaComment.find({ postMetaId }).sort({ createdAt: -1 });

    return res.json(comments);
  } catch (err: any) {
    console.error("Error fetching meta comments:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};