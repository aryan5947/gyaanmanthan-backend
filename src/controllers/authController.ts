import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- SIGNUP ---
export const signup = async (req: Request, res: Response) => {
  // 1. Route se aa rahe validation errors ko check karein
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, username, email, password, bio } = req.body;

  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: 'Email or username already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    let avatarUrl: string | undefined;

    // Optional avatar upload
    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
      const up = await uploadBufferToCloudinary(file.buffer, file.mimetype, 'avatars');
      avatarUrl = up.url;
    }

    const user = await User.create({
      name,
      username,
      email,
      passwordHash,
      bio,
      avatarUrl,
    });

    const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });
    
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        plan: user.plan,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  // 1. Route se aa rahe validation errors ko check karein
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body; // Use 'email' directly as per route validation

  try {
    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }],
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });
    
    return res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        plan: user.plan,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
