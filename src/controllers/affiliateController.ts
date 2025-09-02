import { Request, Response } from 'express';
import { AffiliateEvent } from '../models/AffiliateEvent';

export const logClick = async (req: Request, res: Response) => {
  const { targetUrl, postId } = req.body;
  if (!targetUrl) return res.status(400).json({ message: 'targetUrl is required' });

  const evt = await AffiliateEvent.create({
    user: req.user?.id,
    post: postId,
    targetUrl,
    type: 'click',
    meta: { ua: req.headers['user-agent'], ip: req.ip },
  });

  return res.status(201).json({ ok: true, id: evt._id });
};

export const logConversion = async (req: Request, res: Response) => {
  const { clickId, revenue } = req.body;
  if (!clickId) return res.status(400).json({ message: 'clickId is required' });

  await AffiliateEvent.updateOne({ _id: clickId }, { $set: { type: 'conversion' }, $setOnInsert: {} });
  // You could also credit creator here if mapping exists
  return res.json({ ok: true, revenue: Number(revenue) || 0 });
};
