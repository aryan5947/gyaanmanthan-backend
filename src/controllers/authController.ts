import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { env } from '../config/env';
import { uploadBufferToCloudinary } from '../utils/cloudinary';
import { sendMail } from '../config/mailService';
import { welcomeTemplate } from '../mails/emailTemplates';
import { securityAlertTemplate } from '../mails/emailTemplates';
import { UserDevice } from '../models/UserDevice';
import { createNotification } from '../utils/createNotification';
import { sendTelegramAlertWithButtons } from '../utils/telegramBot.js';
import { v4 as uuidv4 } from 'uuid';

// ---- helpers ----------------------------------------------------------------

const getClientIp = (req: Request): string => {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  const ip = xff.split(',').map(s => s.trim())[0] || (req.ip || '').toString();
  return ip || 'unknown';
};

const getDeviceInfo = (req: Request): { deviceId: string; deviceInfo: string } => {
  // Prefer app-provided fingerprint, else fallback to UUID for first login
  const deviceIdHeader =
    (req.headers['x-device-id'] as string) ||
    (req.headers['x-deviceid'] as string) ||
    '';
  const deviceId = deviceIdHeader.trim() || uuidv4();

  // Optional client-provided info, else user-agent
  const deviceInfoHeader =
    (req.headers['x-device-info'] as string) ||
    (req.headers['x-deviceinfo'] as string) ||
    '';
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown device';
  const deviceInfo = deviceInfoHeader.trim() || userAgent;

  return { deviceId, deviceInfo };
};

const notifyNewDevice = async (params: {
  userId: mongoose.Types.ObjectId;
  username?: string | null;
  deviceInfo: string;
  ip: string;
}) => {
  const { userId, username, deviceInfo, ip } = params;

  // In-app notification
  await createNotification({
    userId,
    type: 'security',
    message: `New login detected from ${deviceInfo} (${ip})`,
    relatedUser: userId
  });

  // Optional: Telegram alert to ops/admin channel (buttons to manage quickly)
  try {
    await sendTelegramAlertWithButtons(
      '🔐 New device login',
      `User: @${username || 'user'}
Device: ${deviceInfo}
IP: ${ip}
Time: ${new Date().toISOString()}`,
      [
        [{ text: '👀 Review User', callback_data: `review_user_${String(userId)}` }],
        [{ text: '🚫 Force Logout', callback_data: `force_logout_${String(userId)}` }]
      ]
    );
  } catch (e) {
    // Non-blocking
    console.warn('Telegram notifyNewDevice failed:', e);
  }
};

const upsertUserDevice = async (params: {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  deviceInfo: string;
  ip: string;
}) => {
  const { userId, deviceId, deviceInfo, ip } = params;
  const existing = await UserDevice.findOne({ userId, deviceId });

  if (!existing) {
    await UserDevice.create({
      userId,
      deviceId,
      deviceInfo,
      ip,
      lastLogin: new Date()
    });
    return { isNewDevice: true };
  } else {
    existing.deviceInfo = deviceInfo; // keep latest UA string
    existing.ip = ip;
    existing.lastLogin = new Date();
    await existing.save();
    return { isNewDevice: false };
  }
};

// --- SIGNUP -------------------------------------------------------------------
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

    // ✅ Device bootstrap on signup (first device)
    const { deviceId, deviceInfo } = getDeviceInfo(req);
    const ip = getClientIp(req);
    try {
      await upsertUserDevice({
        userId: user._id as mongoose.Types.ObjectId,
        deviceId,
        deviceInfo,
        ip
      });

      // Gentle heads-up: first device login
      await createNotification({
        userId: user._id as mongoose.Types.ObjectId,
        type: 'security',
        message: `Welcome! Signed in on ${deviceInfo} (${ip})`,
        relatedUser: user._id as mongoose.Types.ObjectId
      });
    } catch (e) {
      console.warn('Device bootstrap failed on signup:', e);
    }

    // ✅ Respond with token + user data
    return res.status(201).json({
      token,
      deviceId,
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

// --- LOGIN --------------------------------------------------------------------
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

    // Before issuing token, detect device
    const { deviceId, deviceInfo } = getDeviceInfo(req);
    const ip = getClientIp(req);

    let isNewDevice = false;
    try {
      const result = await upsertUserDevice({
        userId: user._id as mongoose.Types.ObjectId,
        deviceId,
        deviceInfo,
        ip
      });
      isNewDevice = result.isNewDevice;
    } catch (e) {
      console.warn('Device upsert failed on login:', e);
    }

    // On new device → notify + email
    if (isNewDevice) {
      try {
        // In-app + Telegram
        await notifyNewDevice({
          userId: user._id as mongoose.Types.ObjectId,
          username: user.username,
          deviceInfo,
          ip
        });

        // 📧 Email alert
        await sendMail({
          to: user.email,
          subject: 'Security Alert — New Login Detected',
          html: securityAlertTemplate({
            name: user.name || user.username,
            deviceInfo,
            ip,
            time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            manageDevicesLink: `${env.appUrl}/settings/devices`
          })
        });
      } catch (e) {
        console.warn('notifyNewDevice/email failed:', e);
      }
    }

    // Issue JWT
    const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: '7d' });

    return res.json({
      token,
      deviceId,
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
      loginMeta: {
        isNewDevice,
        deviceInfo,
        ip
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
