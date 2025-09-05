import { Request, Response } from "express";
import { connectDB } from "../config/db";
import { Post } from "../models/Post";
import { uploadBufferToCloudinary } from "../utils/cloudinary";
import { getSponsoredForFeed } from "./adController";
import { IPost } from "../models/Post";
import { IAd } from "../models/Ad";

// Union type for feed items
type FeedItem =
  | { type: "post"; data: IPost }
  | { type: "sponsored"; data: IAd };

// ---------------- CREATE POST ----------------
export const createPost = async (req: Request, res: Response) => {
  try {
    await connectDB();

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
        const up = await uploadBufferToCloudinary(
          f.buffer,
          f.mimetype,
          "posts"
        );
        images.push(up.url);
      }
    }

    // ✅ user info (from auth middleware)
    const userId = req.user?.id;
    const userName = req.user?.name || "Anonymous";
    const userAvatar = req.user?.avatarUrl || "";

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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ---------------- FEED (Infinite Scroll) ----------------
export const getFeed = async (req: Request, res: Response) => {
  try {
    await connectDB();

    const { lastId, limit = 10 } = req.query as any;
    const query: any = {};

    if (lastId) {
      query._id = { $lt: lastId }; // fetch older posts
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    const feed: FeedItem[] = posts.map((p) => ({
      type: "post",
      data: p as unknown as IPost,
    }));

    // Sponsored ad injection
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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
