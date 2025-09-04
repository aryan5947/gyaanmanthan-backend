import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- SIGNUP ---
export const signup = async (req: Request, res: Response) => {
  const { name, username, email, password, bio } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

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
  // ** UPDATE: Return userId as "user._id" (not just "id") **
  return res.status(201).json({
    token,
    user: {
      id: user._id,
      _id: user._id, // <-- For frontend localStorage userId!
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      plan: user.plan,
      walletBalance: user.walletBalance,
    },
  });
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const user = await User.findOne({
    $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
  });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });
  // ** UPDATE: Return userId as "user._id" (not just "id") **
  return res.json({
    token,
    user: {
      id: user._id,
      _id: user._id, // <-- For frontend localStorage userId!
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      plan: user.plan,
      walletBalance: user.walletBalance,
    },
  });
};