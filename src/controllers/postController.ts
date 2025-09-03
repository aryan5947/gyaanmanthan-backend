import { Request, Response } from "express";
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
    });

    return res.status(201).json({ post });
  } catch (err: any) {
    console.error("Error creating post:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ---------------- FEED ----------------
export const getFeed = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Map posts to feed items
    const feed: FeedItem[] = posts.map((p) => ({
      type: "post",
      data: p as unknown as IPost,
    }));

    // Get sponsored ad
    const sponsored = await getSponsoredForFeed(req);

    // Inject sponsored ad after 4th post
    if (sponsored) {
      feed.splice(Math.min(4, feed.length), 0, {
        type: "sponsored",
        data: sponsored as unknown as IAd,
      });
    }

    return res.json({ feed, page: Number(page), count: feed.length });
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
    const posts = await Post.find({ authorId: req.params.id }).sort({
      createdAt: -1,
    });
    return res.json({ posts });
  } catch (err: any) {
    console.error("Error fetching user posts:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
