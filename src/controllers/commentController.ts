import { Request, Response } from "express";
import { Comment } from "../models/Comment";

// ---------------- ADD COMMENT ----------------
export const addComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { text } = req.body;
    const { postId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await Comment.create({
      postId,
      authorId: req.user._id,
      authorName: req.user.name,
      text,
    });

    return res.status(201).json({ comment });
  } catch (err: any) {
    console.error("Error adding comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- ADD REPLY ----------------
export const addReply = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { text } = req.body;
    const { commentId } = req.params;

    if (!text) return res.status(400).json({ message: "Text is required" });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({
      authorId: req.user._id,
      authorName: req.user.name,
      text,
      likes: 0,
      createdAt: new Date(),
    });

    await comment.save();
    return res.status(201).json({ comment });
  } catch (err: any) {
    console.error("Error adding reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- LIKE / UNLIKE COMMENT ----------------
export const likeComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.likes = (comment.likes || 0) + 1;
    await comment.save();

    return res.json({ message: "Comment liked", likes: comment.likes });
  } catch (err: any) {
    console.error("Error liking comment:", err);
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

    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    comment.text = text;
    await comment.save();

    return res.json({ message: "Comment updated", comment });
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

    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await comment.deleteOne();
    return res.json({ message: "Comment deleted" });
  } catch (err: any) {
    console.error("Error deleting comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET COMMENTS FOR POST ----------------
export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    return res.json({ comments });
  } catch (err: any) {
    console.error("Error fetching comments:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
