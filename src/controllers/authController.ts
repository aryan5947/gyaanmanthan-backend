// controllers/authController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- SIGNUP ---
export const signup = async (req: Request, res: Response) => {
  // ✅ Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, username, email, password, bio } = req.body;

  try {
    // ✅ Check if email or username already exists
    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (exists) {
      return res.status(409).json({ message: 'Email or username already in use' });
    }

    // ✅ Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    let avatarUrl: string | undefined;
    let bannerUrl: string | undefined;

    // ✅ Handle multiple file fields (avatar + banner)
    const files = (req as any).files as {
      avatar?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    };

    if (files?.avatar?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.avatar[0].buffer,
        files.avatar[0].mimetype,
        'avatars'
      );
      avatarUrl = up.url;
    }

    if (files?.banner?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.banner[0].buffer,
        files.banner[0].mimetype,
        'banners'
      );
      bannerUrl = up.url;
    }

    // ✅ Create user
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      bio,
      avatarUrl,
      bannerUrl, // ✅ store banner in DB
    });

    // ✅ Generate JWT
    const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });

    // ✅ Respond with token + user data
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl, // ✅ return banner
        bio: user.bio,
        plan: user.plan,
        walletBalance: user.walletBalance,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  // ✅ Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // ✅ Allow login via email OR username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
      ],
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Compare password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Generate JWT
    const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });

    // ✅ Respond with token + user data
    return res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl, // ✅ return banner
        bio: user.bio,
        plan: user.plan,
        walletBalance: user.walletBalance,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
