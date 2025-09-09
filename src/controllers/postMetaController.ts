import { Request, Response } from "express";
import { connectDB } from "../config/db";
import { PostMeta, IPostMeta } from "../models/PostMeta";
import { uploadBufferToCloudinary } from "../utils/cloudinary";
import { getSponsoredForFeed } from "./adController";
import { IAd } from "../models/Ad";

type FeedItem =
  | { type: "post"; data: IPostMeta }
  | { type: "sponsored"; data: IAd };

// ---------------- CREATE POST META ----------------
export const createPostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();

    if (!req.user || !req.user.id || !req.user.role) {
      console.warn("Unauthorized access attempt:", {
        headers: req.headers,
        user: req.user,
      });
      return res.status(403).json({ message: "Access denied: not authenticated" });
    }

    // ✅ Role OR Ownership check (create के समय ownership हमेशा true)
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user.role);
    const isOwner = true;

    if (!isAdminOrMod && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, category, tags } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const filesArr: { url: string; type: string; name?: string; size?: number }[] = [];
    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (files?.length) {
      for (const f of files) {
        const up = await uploadBufferToCloudinary(f.buffer, f.mimetype, "post-meta");
        filesArr.push({
          url: up.url,
          type: f.mimetype.startsWith("image")
            ? "image"
            : f.mimetype.startsWith("video")
            ? "video"
            : "file",
          name: f.originalname,
          size: f.size,
        });
      }
    }

    const userId = req.user.id;
    const userName = req.user.name || "Anonymous";
    const userAvatar = req.user.avatarUrl || "";

    const postMeta = await PostMeta.create({
      title,
      description,
      category: category || "General",
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim())
        : [],
      files: filesArr,
      authorId: userId,
      authorName: userName,
      authorAvatar: userAvatar,
    });

    return res.status(201).json({ postMeta });
  } catch (err: any) {
    console.error("Error creating post meta:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UPDATE POST META ----------------
export const updatePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const postId = req.params.id;
    const { title, description, category, tags, removeFiles } = req.body;

    const postMeta = await PostMeta.findById(postId);
    if (!postMeta) {
      return res.status(404).json({ message: "PostMeta not found" });
    }

    const userId = req.user?.id;
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user?.role || "");
    const isOwner = postMeta.authorId.toString() === userId;

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    if (title) postMeta.title = title;
    if (description) postMeta.description = description;
    if (category) postMeta.category = category;
    if (tags) {
      postMeta.tags = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim())
        : [];
    }

    if (removeFiles && Array.isArray(removeFiles)) {
      postMeta.files = postMeta.files.filter(
        (file) => !removeFiles.includes(file.url)
      );
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files?.length) {
      for (const f of files) {
        const up = await uploadBufferToCloudinary(f.buffer, f.mimetype, "post-meta");
        postMeta.files.push({
          url: up.url,
          type: f.mimetype.startsWith("image")
            ? "image"
            : f.mimetype.startsWith("video")
            ? "video"
            : "file",
          name: f.originalname,
          size: f.size,
        });
      }
    }

    await postMeta.save();
    return res.json({ message: "PostMeta updated successfully", postMeta });
  } catch (err: any) {
    console.error("Error updating post meta:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE POST META ----------------
export const deletePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const postId = req.params.id;
    const postMeta = await PostMeta.findById(postId);
    if (!postMeta) {
      return res.status(404).json({ message: "PostMeta not found" });
    }

    const userId = req.user?.id;
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user?.role || "");
    const isOwner = postMeta.authorId.toString() === userId;

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await postMeta.deleteOne();
    return res.json({ message: "PostMeta deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting post meta:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- FEED (Infinite Scroll) ----------------
export const getPostMetaFeed = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { lastId, limit = 10 } = req.query as any;
    const query: any = {};
    if (lastId) query._id = { $lt: lastId };

    const posts = await PostMeta.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    const feed: FeedItem[] = posts.map((p) => ({
      type: "post",
      data: p as unknown as IPostMeta,
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
    console.error("Error fetching post meta feed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- USER POST META ----------------
export const getUserPostMetas = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { lastId, limit = 10 } = req.query as any;
    const query: any = { authorId: req.params.id };
    if (lastId) query._id = { $lt: lastId };

    const posts = await PostMeta.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({
      posts,
      nextCursor: posts.length > 0 ? posts[posts.length - 1]._id : null,
    });
  } catch (err: any) {
    console.error("Error fetching user post metas:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
