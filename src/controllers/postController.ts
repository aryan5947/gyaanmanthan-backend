import { Request, Response } from "express";
import { connectDB } from "../config/db";
import { Post, IPost } from "../models/Post";
import { User } from "../models/User";
import mongoose from "mongoose";
import { uploadBufferToCloudinary } from "../utils/cloudinary";
import { getSponsoredForFeed } from "./adController";
import { IAd } from "../models/Ad";
import { PostLike } from "../models/PostLike";
import { SavedPost } from "../models/SavedPost";

type FeedItem =
  | { type: "post"; data: IPost }
  | { type: "sponsored"; data: IAd };

// ✅ AuthRequest now just reuses globally declared Request type
type AuthRequest = Request;

// ---------------- CREATE POST ----------------
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    await connectDB();

    if (!req.user?.id || !req.user.role) {
      return res.status(403).json({ message: "Access denied: not authenticated" });
    }

    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user.role);
    const isOwner = true; // create ke time hamesha true

    if (!isAdminOrMod && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, content, category, tags } = req.body;

    if (!title || !description || !content) {
      return res
        .status(400)
        .json({ message: "Title, description, and content are required" });
    }

    const images: string[] = [];
    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (files?.length) {
      for (const f of files) {
        const up = await uploadBufferToCloudinary(f.buffer, f.mimetype, "posts");
        images.push(up.url);
      }
    }

    // ✅ Fetch username + avatar + golden tick from DB
    const userDoc = await User.findById(req.user.id).select(
      "name username avatarUrl isGoldenVerified"
    );
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.create({
      title,
      description,
      content,
      category: category || "General",
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim())
        : [],
      images,
      authorId: userDoc._id,
      authorName: userDoc.name,
      authorUsername: userDoc.username,       // ✅ from DB
      authorAvatar: userDoc.avatarUrl || "",
      isGoldenVerified: userDoc.isGoldenVerified // ✅ from DB
    });

    return res.status(201).json({ post });
  } catch (err: any) {
    console.error("Error creating post:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UPDATE POST ----------------
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    await connectDB();

    const postId = req.params.id;
    const { title, description, content, category, tags, removeImages } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user?.id;
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user?.role || "");
    const isOwner = post.authorId.toString() === userId;

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    // ✅ Refresh author info from DB
    const userDoc = await User.findById(post.authorId).select(
      "name username avatarUrl isGoldenVerified"
    );
    if (userDoc) {
      post.authorName = userDoc.name;
      post.authorUsername = userDoc.username;
      post.authorAvatar = userDoc.avatarUrl || "";
      post.isGoldenVerified = userDoc.isGoldenVerified;
    }

    if (title) post.title = title;
    if (description) post.description = description;
    if (content) post.content = content;
    if (category) post.category = category;
    if (tags) {
      post.tags = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim())
        : [];
    }

    if (removeImages && Array.isArray(removeImages)) {
      post.images = post.images.filter((img) => !removeImages.includes(img));
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files?.length) {
      for (const f of files) {
        const up = await uploadBufferToCloudinary(f.buffer, f.mimetype, "posts");
        post.images.push(up.url);
      }
    }

    await post.save();
    return res.json({ message: "Post updated successfully", post });
  } catch (err: any) {
    console.error("Error updating post:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------- DELETE POST ----------------
export const deletePost = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user?.id;
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user?.role || "");
    const isOwner = post.authorId.toString() === userId;

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();
    return res.json({ message: "Post deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting post:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- FEED (Infinite Scroll) ----------------
export const getFeed = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { lastId, limit = 10 } = req.query as any;
    const query: any = {};

    if (lastId) {
      query._id = { $lt: lastId };
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    const feed: FeedItem[] = posts.map((p) => ({
      type: "post",
      data: p as unknown as IPost,
    }));

    const sponsored = await getSponsoredForFeed(req);
    if (sponsored) {
      feed.splice(Math.min(4, feed.length), 0, {
        type: "sponsored",
        data: sponsored as unknown as IAd,
      });
    }

    return res.json({
      feed,
      nextCursor: posts.length > 0 ? posts[posts.length - 1]._id : null,
    });
  } catch (err: any) {
    console.error("Error fetching feed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- USER POSTS ----------------
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { lastId, limit = 10 } = req.query as any;
    const query: any = { authorId: req.params.id };

    if (lastId) {
      query._id = { $lt: lastId };
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({
      posts,
      nextCursor: posts.length > 0 ? posts[posts.length - 1]._id : null,
    });
  } catch (err: any) {
    console.error("Error fetching user posts:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET POST BY ID ----------------
export const getPostById = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { id } = req.params;
    const post = await Post.findById(id).lean();

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json(post);
  } catch (err: any) {
    console.error("Error fetching Post by ID:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- LIKE / UNLIKE POST ----------------
export const likePost = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const alreadyLiked = await PostLike.findOne({ userId, postId });
    if (alreadyLiked) {
      return res.status(400).json({ message: "Already liked" });
    }

    await PostLike.create({ userId, postId });
    await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });

    // Populate full post details for response
    const updatedPost = await Post.findById(postId)
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post liked", post: updatedPost });
  } catch (err: any) {
    console.error("Error liking post:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const unlikePost = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const deleted = await PostLike.deleteOne({ userId, postId });
    if (deleted.deletedCount > 0) {
      await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });
    }

    const updatedPost = await Post.findById(postId)
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post unliked", post: updatedPost });
  } catch (err: any) {
    console.error("Error unliking post:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- SAVE / UNSAVE POST ----------------
export const savePost = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const alreadySaved = await SavedPost.findOne({ userId, postId });
    if (alreadySaved) {
      return res.status(400).json({ message: "Already saved" });
    }

    await SavedPost.create({ userId, postId });
    await Post.findByIdAndUpdate(postId, { $inc: { saveCount: 1 } });

    const updatedPost = await Post.findById(postId)
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post saved", post: updatedPost });
  } catch (err: any) {
    console.error("Error saving post:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const unsavePost = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const deleted = await SavedPost.deleteOne({ userId, postId });
    if (deleted.deletedCount > 0) {
      await Post.findByIdAndUpdate(postId, { $inc: { saveCount: -1 } });
    }

    const updatedPost = await Post.findById(postId)
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post unsaved", post: updatedPost });
  } catch (err: any) {
    console.error("Error unsaving post:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const viewPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const viewerId = (req as any).user?._id; // JWT middleware se user attach hota hai
    const viewerIp = req.ip;

    const updatedPost = await Post.incrementView(id, viewerId, viewerIp);

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json(updatedPost);
  } catch (error) {
    console.error("Error incrementing Post view:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};