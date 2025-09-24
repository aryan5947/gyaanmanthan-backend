import { Request, Response } from "express";
import { connectDB } from "../config/db";
import { PostMeta, IPostMeta } from "../models/PostMeta";
import { User } from "../models/User";
import { uploadBufferToCloudinary } from "../utils/cloudinary";
import { getSponsoredForFeed } from "./adController";
import mongoose from "mongoose";
import { IAd } from "../models/Ad";
import { Like } from "../models/LikePostMeta";
import { SavedPostMeta } from "../models/SavedPostMeta";

type FeedItem =
   | { type: "postMeta"; data: IPostMeta }
  | { type: "sponsored"; data: IAd };
// ---------------- CREATE POST META ----------------
export const createPostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();

    if (!req.user?.id || !req.user.role) {
      console.warn("Unauthorized access attempt:", {
        headers: req.headers,
        user: req.user,
      });
      return res
        .status(403)
        .json({ success: false, message: "Access denied: not authenticated" });
    }

    const { title, description, category, tags } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const filesArr: { url: string; type: string; name?: string; size?: number }[] = [];
    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (files?.length) {
      for (const f of files) {
        try {
          // ✅ Utility अब खुद resource_type detect करेगा
          const up = await uploadBufferToCloudinary(f.buffer, f.mimetype, "post-meta");

          // ✅ Normalize type for schema
          let normalizedType = "file";
          if (f.mimetype.startsWith("image/")) normalizedType = "image";
          else if (f.mimetype.startsWith("video/")) normalizedType = "video";
          else if (f.mimetype === "application/pdf") normalizedType = "pdf";
          else if (f.mimetype.includes("word")) normalizedType = "word";
          else if (f.mimetype.includes("presentation")) normalizedType = "ppt";

          filesArr.push({
            url: up.url,
            type: normalizedType,
            name: f.originalname,
            size: f.size,
          });
        } catch (uploadErr) {
          console.error("File upload failed:", f.originalname, uploadErr);
          // continue with other files instead of failing whole request
        }
      }
    }

    // ✅ Fetch username + avatar + golden tick from DB
    const userDoc = await User.findById(req.user.id).select(
      "name username avatarUrl isGoldenVerified"
    );
    if (!userDoc) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Normalize category + tags
    const normalizedCategory = category ? category.trim().toLowerCase() : "General";
    const normalizedTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim().toLowerCase())
      : typeof tags === "string"
      ? tags.split(",").map((t: string) => t.trim().toLowerCase())
      : [];

    const postMeta = await PostMeta.create({
      title,
      description,
      category: normalizedCategory, // schema hook will auto-detect if "General"
      tags: normalizedTags,
      files: filesArr,
      authorId: userDoc._id,
      authorName: userDoc.name,
      authorUsername: userDoc.username,
      authorAvatar: userDoc.avatarUrl || "",
      isGoldenVerified: userDoc.isGoldenVerified,
    });

    return res.status(201).json({ success: true, data: postMeta });
  } catch (err: any) {
    console.error("Error creating post meta:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
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
      return res.status(404).json({ success: false, message: "PostMeta not found" });
    }

    const userId = req.user?.id;
    const allowedRoles = ["admin", "moderator"];
    const isAdminOrMod = allowedRoles.includes(req.user?.role || "");
    const isOwner = postMeta.authorId.toString() === userId;

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this post" });
    }

    // ✅ Refresh author info from DB
    const userDoc = await User.findById(postMeta.authorId).select(
      "name username avatarUrl isGoldenVerified"
    );
    if (userDoc) {
      postMeta.authorName = userDoc.name;
      postMeta.authorUsername = userDoc.username;
      postMeta.authorAvatar = userDoc.avatarUrl || "";
      postMeta.isGoldenVerified = userDoc.isGoldenVerified;
    }

    if (title) postMeta.title = title;
    if (description) postMeta.description = description;

    // ✅ Normalize category + tags
    if (category) {
      postMeta.category = category.trim().toLowerCase();
    }
    if (tags) {
      postMeta.tags = Array.isArray(tags)
        ? tags.map((t: string) => t.trim().toLowerCase())
        : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim().toLowerCase())
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
    return res.json({ success: true, message: "PostMeta updated successfully", data: postMeta });
  } catch (err: any) {
    console.error("Error updating post meta:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
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

    // ✅ Set correct type so frontend knows it's a PostMeta
    const feed: FeedItem[] = posts.map((p) => ({
      type: "postMeta",
      data: { ...p, type: "postMeta" } as unknown as IPostMeta, // inject type in data too
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

    // ✅ Inject type field so frontend can detect it's a PostMeta
    const postsWithType = posts.map(pm => ({
      ...pm,
      type: "postMeta"
    }));

    return res.json({
      posts: postsWithType,
      nextCursor: postsWithType.length > 0 ? postsWithType[postsWithType.length - 1]._id : null,
    });
  } catch (err: any) {
    console.error("Error fetching user post metas:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET POST META BY ID ----------------
export const getPostMetaById = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { id } = req.params;
    const postMeta = await PostMeta.findById(id).lean();

    if (!postMeta) {
      return res.status(404).json({ error: "PostMeta not found" });
    }

    return res.json(postMeta);
  } catch (err: any) {
    console.error("Error fetching PostMeta by ID:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- LIKE / UNLIKE POST META ----------------
export const likePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postMetaId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Prevent duplicate likes
    const alreadyLiked = await Like.findOne({ userId, postMetaId });
    if (alreadyLiked) {
      return res.status(400).json({ message: "Already liked" });
    }

    await Like.create({ userId, postMetaId });
    await PostMeta.findByIdAndUpdate(postMetaId, { $inc: { "stats.likes": 1 } });

    // Populate full PostMeta for response
    const updatedPostMeta = await PostMeta.findById(postMetaId)
      .select("title description category tags files authorId authorName authorAvatar stats createdAt")
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post liked", postMeta: updatedPostMeta });
  } catch (err: any) {
    console.error("Error liking post meta:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const unlikePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postMetaId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const deleted = await Like.deleteOne({ userId, postMetaId });
    if (deleted.deletedCount > 0) {
      await PostMeta.findByIdAndUpdate(postMetaId, { $inc: { "stats.likes": -1 } });
    }

    const updatedPostMeta = await PostMeta.findById(postMetaId)
      .select("title description category tags files authorId authorName authorAvatar stats createdAt")
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post unliked", postMeta: updatedPostMeta });
  } catch (err: any) {
    console.error("Error unliking post meta:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- SAVE / UNSAVE POST META ----------------
export const savePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postMetaId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const alreadySaved = await SavedPostMeta.findOne({ userId, postMetaId });
    if (alreadySaved) {
      return res.status(400).json({ message: "Already saved" });
    }

    await SavedPostMeta.create({ userId, postMetaId });
    await PostMeta.findByIdAndUpdate(postMetaId, { $inc: { saveCount: 1 } });

    const updatedPostMeta = await PostMeta.findById(postMetaId)
      .select("title description category tags files authorId authorName authorAvatar stats createdAt")
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post saved", postMeta: updatedPostMeta });
  } catch (err: any) {
    console.error("Error saving post meta:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const unsavePostMeta = async (req: Request, res: Response) => {
  try {
    await connectDB();
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const { id: postMetaId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const deleted = await SavedPostMeta.deleteOne({ userId, postMetaId });
    if (deleted.deletedCount > 0) {
      await PostMeta.findByIdAndUpdate(postMetaId, { $inc: { saveCount: -1 } });
    }

    const updatedPostMeta = await PostMeta.findById(postMetaId)
      .select("title description category tags files authorId authorName authorAvatar stats createdAt")
      .populate("authorId", "name username avatarUrl")
      .lean();

    return res.status(200).json({ message: "Post unsaved", postMeta: updatedPostMeta });
  } catch (err: any) {
    console.error("Error unsaving post meta:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const viewPostMeta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const viewerId = (req as any).user?._id; // agar tum JWT middleware se user attach karte ho
    const viewerIp = req.ip;

    const updated = await PostMeta.incrementView(id, viewerId, viewerIp);

    if (!updated) {
      return res.status(404).json({ message: "PostMeta not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error incrementing PostMeta view:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
