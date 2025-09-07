import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- GET CURRENT LOGGED-IN USER ---
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- GET USER PROFILE BY ID (with follow flags) ---
export const getProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const targetUser = await User.findById(req.params.id)
      .select('-passwordHash')
      .lean();

    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    let isFollowing = false;
    let isMutual = false;

    if (req.user && req.user.id.toString() !== targetUser._id.toString()) {
      const [currentFollowsTarget, targetFollowsCurrent] = await Promise.all([
        Follow.exists({ follower: req.user.id, following: targetUser._id }),
        Follow.exists({ follower: targetUser._id, following: req.user.id }),
      ]);

      isFollowing = !!currentFollowsTarget;
      isMutual = !!currentFollowsTarget && !!targetFollowsCurrent;
    }

    return res.json({
      user: {
        ...targetUser,
        isFollowing,
        isMutual,
      },
    });
  } catch (error) {
    console.error('GetProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- UPDATE USER PROFILE ---
export const updateProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, bio } = req.body;
  const updates: any = {};

  if (name) updates.name = name;
  if (bio) updates.bio = bio;

  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
      const up = await uploadBufferToCloudinary(file.buffer, file.mimetype, 'avatars');
      updates.avatarUrl = up.url;
    }

    const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true })
      .select('-passwordHash');

    return res.json({ user });
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
