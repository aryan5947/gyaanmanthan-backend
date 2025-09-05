import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- GET CURRENT LOGGED-IN USER ---
export const getMe = async (req: Request, res: Response) => {
  // auth middleware pehle hi user ko req object mein daal deta hai.
  // Hum yahan seedhe use bhej sakte hain.
  try {
    // req.user!.id se user ko dobara fetch kar sakte hain taaki latest data mile.
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- GET USER PROFILE BY ID ---
export const getProfile = async (req: Request, res: Response) => {
  // 1. Route se aa rahe validation errors ko check karein (e.g., isMongoId)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    console.error('GetProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- UPDATE USER PROFILE ---
export const updateProfile = async (req: Request, res: Response) => {
  // 1. Route se aa rahe validation errors ko check karein
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, bio } = req.body;
  const updates: any = {};

  // Jo fields body mein hain, sirf unhe hi update object mein daalein
  if (name) updates.name = name;
  if (bio) updates.bio = bio;

  try {
    // Check karein ki file upload hui hai ya nahi
    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
      const up = await uploadBufferToCloudinary(file.buffer, file.mimetype, 'avatars');
      updates.avatarUrl = up.url;
    }

    // Logged-in user ki ID ka istemaal karke user ko update karein
    const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true }).select('-passwordHash');
    return res.json({ user });
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
