// controllers/adController.ts
import { Request, Response } from "express";
import { PostMeta } from "../models/PostMeta";

// ✅ Create Ad
export const createAd = async (req: Request, res: Response) => {
  try {
    const { title, description, files, ctaText, ctaUrl, targeting } = req.body;

    const ad = await PostMeta.create({
      title,
      description,
      files,
      ctaText,
      ctaUrl,
      targeting,
      postType: "ad",
      authorName: "System",
      authorUsername: "sponsored",
      isGoldenVerified: false,
      category: "advertisement",
    });

    return res.status(201).json({ success: true, ad });
  } catch (err: any) {
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
