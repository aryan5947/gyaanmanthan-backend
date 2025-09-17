import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { auth } from './middleware/auth';

// Routes
import authRoutes from './routes/authRoutes';
import notificationRoutes from "./routes/notificationRoutes";
import followRoutes from './routes/followRoutes';
import adminRoutes from './routes/admin.routes';
import telegramWebhook from './routes/telegramWebhook';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import postMetaRoutes from './routes/postMeta.routes';
import adRoutes from './routes/adRoutes';
import commentRoutes from './routes/commentRoutes';
import postMetaCommentRoutes from './routes/postMetaComment.routes';
import affiliateRoutes from './routes/affiliateRoutes';
import walletRoutes from './routes/walletRoutes';
import authMailRoutes from './routes/authMail';
import telegramRoutes from "./routes/telegram";

const app = express();

// --- SECURITY MIDDLEWARES ---

// 1. Security headers
app.use(helmet());

// 2. Telegram webhook FIRST (skip CORS, ratelimit, auth)
app.post('/telegram-webhook', express.json(), telegramWebhook);

// ✅ Mount Telegram routes with a base path
app.use("/api/telegram", telegramRoutes);

// 3. Configure CORS
const allowedOrigins = [
  'http://localhost:3000', // React
  'http://localhost:5173', // Vite
  'https://gyaanmanthan.in', // Production domain
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like Telegram webhooks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// 4. Rate Limiting (only /api)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

// --- CORE MIDDLEWARES ---

// 5. Body parser
app.use(express.json({ limit: '2mb' }));

// 6. Sanitize against NoSQL injection
app.use(mongoSanitize());

// 7. Logger
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// 8. Serve favicon
app.use(
  '/favicon.ico',
  express.static(path.join(__dirname, 'public', 'favicon.ico'))
);

// --- ROUTES ---

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/auth-mail', authMailRoutes);

// Mixed (public/private)
app.use('/api/posts', postRoutes);
app.use('/api/post-meta', postMetaRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/postMeta-comments', postMetaCommentRoutes);

// Fully protected routes
app.use('/api/user', auth, userRoutes);
app.use('/api/user', auth, followRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ads', auth, adRoutes);
app.use('/api/affiliate', auth, affiliateRoutes);
app.use('/api/wallet', auth, walletRoutes);

// --- ERROR HANDLING ---
app.use(errorHandler);

// --- SERVER START ---
async function start() {
  await connectDB();
  const PORT = env.port;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on :${PORT} [${env.nodeEnv}]`);
  });
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
