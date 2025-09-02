import { Request, Response } from 'express';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

const PLATFORM_COMMISSION_RATE = 0.1; // 10% platform fee

export const getWallet = async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('walletBalance');
  const tx = await Transaction.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(50);
  return res.json({ balance: user?.walletBalance ?? 0, transactions: tx });
};

// Tip a creator (backend-only ledger; hook payments later)
export const tipCreator = async (req: Request, res: Response) => {
  const { toUserId, amount } = req.body;
  const amt = Number(amount);
  if (!toUserId || !amt || amt <= 0) return res.status(400).json({ message: 'Invalid tip' });

  const commission = +(amt * PLATFORM_COMMISSION_RATE).toFixed(2);
  const net = +(amt - commission).toFixed(2);

  const updated = await User.findByIdAndUpdate(
    toUserId,
    { $inc: { walletBalance: net } },
    { new: true }
  ).select('walletBalance');
  if (!updated) return res.status(404).json({ message: 'Recipient not found' });

  await Transaction.create({
    user: toUserId,
    fromUser: req.user?.id,
    type: 'tip',
    amount: amt,
    platformCommission: commission,
    meta: { note: 'Creator tip' },
  });

  return res.status(201).json({ ok: true, recipientBalance: updated.walletBalance, commission });
};
