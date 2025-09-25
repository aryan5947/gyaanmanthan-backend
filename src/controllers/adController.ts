// controllers/adController.ts
import { Request, Response } from "express";
import { PostMeta } from "../models/PostMeta";

// ✅ Create Ad
export const createAd = async (req: Request, res: Response) => {
  try {
    const { title, description, ctaText, ctaUrl, targeting } = req.body;

    // Build files array from Multer
    let files: {
      url: string;
      type: string;
      name?: string;
      size?: number;
    }[] = [];

    if (req.file) {
      // Single file upload
      files.push({
        url: `/uploads/${req.file.filename}`, // or Cloudinary URL if you use cloud storage
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      });
    } else if (Array.isArray((req as any).files)) {
      // Multiple files upload
      files = (req as any).files.map((f: Express.Multer.File) => ({
        url: `/uploads/${f.filename}`,
        type: f.mimetype,
        name: f.originalname,
        size: f.size,
      }));
    }

    // Author info from auth middleware
    const user = (req as any).user || {
      _id: null,
      name: "System",
      username: "sponsored",
      avatar: null,
      isGoldenVerified: false,
    };

    const ad = await PostMeta.create({
      title,
      description,
      files,
      ctaText,
      ctaUrl,
      targeting,
      postType: "ad",
      authorId: user._id,
      authorName: user.name || "System",
      authorUsername: user.username || "sponsored",
      authorAvatar: user.avatar,
      isGoldenVerified: user.isGoldenVerified || false,
      category: "advertisement",
    });

    return res.status(201).json({ success: true, ad });
  } catch (err: any) {
    console.error("Error creating ad:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ List Ads
export const listAds = async (_req: Request, res: Response) => {
  const ads = await PostMeta.find({ postType: "ad" }).sort({ createdAt: -1 });
  return res.json({ ads });
};

// ✅ Click Ad
export const clickAd = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ad = await PostMeta.findByIdAndUpdate(
    id,
    { $inc: { "stats.clicks": 1 } },
    { new: true }
  );
  if (!ad) return res.status(404).json({ message: "Ad not found" });
  return res.json({ ok: true, redirect: ad.ctaUrl });
};

// ✅ Sponsored Ad for Feed
export const getSponsoredForFeed = async (_req: Request) => {
  const ad = await PostMeta.findOne({ postType: "ad", status: "active" })
    .sort({ priority: -1, updatedAt: -1 });
  if (!ad) return null;

  await PostMeta.updateOne({ _id: ad._id }, { $inc: { "stats.views": 1 } });
  return ad;
};
