import { Router } from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { sendMail } from '../config/mailService';
import { welcomeTemplate, resetTemplate } from '../mails/emailTemplates';
import { User } from '../models/User';

const router = Router();

function signToken(payload: object, expiresIn: SignOptions['expiresIn']) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, env.jwtSecret as Secret, options);
}

// 1️⃣ Send verification email
router.post('/send-verify', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('name email emailVerified').lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  if ((user as any).emailVerified) return res.json({ message: 'Already verified' });

  const token = signToken(
    { purpose: 'verify', id: String((user as any)._id) },
    `${env.verifyExpiryMin}m` as SignOptions['expiresIn']
  );
  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: user.email,
    subject: 'Verify your email • GyaanManthan',
    html: welcomeTemplate({ name: user.name || 'there', verifyLink: link }),
  });

  res.json({ message: 'Verification email sent' });
});

// 2️⃣ Verify email (from link)
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, env.jwtSecret as Secret) as { purpose: string; id: string };
    if (decoded.purpose !== 'verify') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }

    const updated = await User.findByIdAndUpdate(
      decoded.id,
      { $set: { emailVerified: true } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Email verified successfully' });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Verification link expired' });
    }
    return res.status(400).json({ message: 'Invalid token' });
  }
});

// 3️⃣ Send password reset email
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('name email').lean();
  if (!user) return res.json({ message: 'If exists, reset email sent' });

  const token = signToken(
    { purpose: 'reset', id: String((user as any)._id) },
    `${env.resetExpiryMin}m` as SignOptions['expiresIn']
  );
  const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: user.email,
    subject: 'Reset your password • GyaanManthan',
    html: resetTemplate({ name: user.name || 'there', resetLink: link, minutes: env.resetExpiryMin }),
  });

  res.json({ message: 'If exists, reset email sent' });
});

// 4️⃣ Reset password (from link)
router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, env.jwtSecret as Secret) as { purpose: string; id: string };
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Hash new password and update correct field
    const hashed = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashed; // <-- FIXED: सही field नाम
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Reset link expired' });
    }
    return res.status(400).json({ message: 'Invalid token' });
  }
});

export default router;
