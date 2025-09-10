import { Request, Response } from "express";
import { connectDB } from "../config/db";
import { Post, IPost } from "../models/Post";
import { uploadBufferToCloudinary } from "../utils/cloudinary";
import { getSponsoredForFeed } from "./adController";
import { IAd } from "../models/Ad";

type FeedItem =
  | { type: "post"; data: IPost }
  | { type: "sponsored"; data: IAd };

// ---------------- CREATE POST ----------------
export const createPost = async (req: Request, res: Response) => {
  try {
    await connectDB();

    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(403).json({ message: "Access denied: not authenticated" });
    }

    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user.role);
    const isOwner = true; // create के समय हमेशा true

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

    const userId = req.user.id;
    const userName = req.user.name || "Anonymous";
    const userAvatar = req.user.avatarUrl || "";

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
      authorId: userId,
      authorName: userName,
      authorAvatar: userAvatar,
    });

    return res.status(201).json({ post });
  } catch (err: any) {
    console.error("Error creating post:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UPDATE POST ----------------
export const updatePost = async (req: Request, res: Response) => {
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
