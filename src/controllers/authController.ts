import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { uploadBufferToCloudinary } from '../utils/cloudinary';
import { sendMail } from '../config/mailService';
import { welcomeTemplate } from '../mails/emailTemplates';

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
      bannerUrl,
    });

    // ✅ Generate verify token
    const verifyToken = jwt.sign(
      { purpose: 'verify', id: String(user._id) },
      env.jwtSecret as Secret,
      { expiresIn: `${env.verifyExpiryMin}m` } as SignOptions
    );

    const verifyLink = `${env.appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;

    // ✅ Send welcome + verify mail
    await sendMail({
      to: user.email,
      subject: 'Welcome to GyaanManthan — Verify your email',
      html: welcomeTemplate({ name: user.name || 'there', verifyLink }),
    });

    // ✅ Generate login JWT
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
        bannerUrl: user.bannerUrl,
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
      ],
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

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
        bannerUrl: user.bannerUrl,
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
