import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  // ⚡️ fallback 8000 (Koyeb expects 8000)
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  mongoUri: required('MONGO_URI'),

  // JWT
  jwtSecret: required('JWT_SECRET'),

  // Cloudinary
  cloudinary: {
    url: process.env.CLOUDINARY_URL,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? 'gyaanmanthan',
  },

  // Brevo SMTP
  smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  smtpPort: Number(process.env.BREVO_SMTP_PORT || 587),
  smtpUser: required('BREVO_SMTP_USER'),
  smtpPass: required('BREVO_SMTP_PASS'),

  // Sender identity
  mailFromName: process.env.MAIL_FROM_NAME || 'GyaanManthan',
  mailFromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@gyaanmanthan.in',
  mailReplyTo: process.env.MAIL_REPLY_TO || 'support@gyaanmanthan.in',

  // Links expiry (minutes)
  verifyExpiryMin: Number(process.env.VERIFY_EXPIRY_MIN || 1440), // 24h
  resetExpiryMin: Number(process.env.RESET_EXPIRY_MIN || 30),     // 30m

  // App URL for email links
  appUrl: process.env.APP_URL || 'https://gyaanmanthan.in',

  // Telegram Admin Panel
  telegram: {
    botToken: required('TELEGRAM_BOT_TOKEN'),
    chatId: required('TELEGRAM_CHAT_ID'),
    allowedChatIds: (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  },

  // ✅ Web Push VAPID Keys
  webpush: {
    publicKey: required('VAPID_PUBLIC_KEY'),
    privateKey: required('VAPID_PRIVATE_KEY'),
    email: process.env.VAPID_EMAIL || 'mailto:info@gyaanmanthan.in',
  }
};
