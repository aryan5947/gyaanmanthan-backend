import { Request, Response } from 'express';
import { User } from '../models/User';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

export const getMe = async (req: Request, res: Response) => {
  return res.json({ user: req.user });
};

export const getProfile = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user });
};

export const updateProfile = async (req: Request, res: Response) => {
  const { name, bio } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (bio) updates.bio = bio;

  const file = (req as any).file as Express.Multer.File | undefined;
  if (file) {
    const up = await uploadBufferToCloudinary(file.buffer, file.mimetype, 'avatars');
    updates.avatarUrl = up.url;
  }

  const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true }).select('-passwordHash');
  return res.json({ user });
};
