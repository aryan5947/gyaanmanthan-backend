import { Request, Response } from 'express';
import { Ad } from '../models/Ad';

// Internal helper used by postController
export async function getSponsoredForFeed(_req: Request) {
  const ad = await Ad.findOne({ active: true }).sort({ priority: -1, updatedAt: -1 });
  if (!ad) return null;

  // Count an impression silently
  await Ad.updateOne({ _id: ad._id }, { $inc: { 'stats.impressions': 1 } });
  return ad;
}

export const listAds = async (_req: Request, res: Response) => {
  const ads = await Ad.find({}).sort({ updatedAt: -1 });
  return res.json({ ads });
};

export const createAd = async (req: Request, res: Response) => {
  const { title, body, imageUrl, ctaText, ctaUrl, priority, targeting } = req.body;
  const ad = await Ad.create({
    title, body, imageUrl, ctaText, ctaUrl,
    priority: Number(priority) || 1,
    targeting: targeting || { tags: [] },
    active: true,
  });
  return res.status(201).json({ ad });
};

export const clickAd = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ad = await Ad.findByIdAndUpdate(id, { $inc: { 'stats.clicks': 1 } }, { new: true });
  if (!ad) return res.status(404).json({ message: 'Ad not found' });
  return res.json({ ok: true, redirect: ad.ctaUrl });
};
