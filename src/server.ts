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

// 📨 Auth mail routes (email verification + password reset)
import authMailRoutes from './routes/authMail';

const app = express();

// --- SECURITY MIDDLEWARES ---

// 1. Set security-related HTTP response headers
app.use(helmet());

// 2. Configure CORS
const allowedOrigins = [
  'http://localhost:3000', // React
  'http://localhost:5173', // Vite
  'https://gyaanmanthan.in', // Production domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// 3. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

app.use('/api', apiLimiter);

// --- CORE MIDDLEWARES ---

// 4. Body parser
app.use(express.json({ limit: '2mb' }));

// 5. Sanitize data
app.use(mongoSanitize());

// 6. HTTP request logger
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// 7. Serve favicon
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// --- ROUTES ---

// Health check endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

// Public routes
app.use('/api/auth', authRoutes);

// Email verification + password reset routes
app.use('/api/auth-mail', authMailRoutes);

// Mixed (public/private) endpoints
app.use('/api/posts', postRoutes);
app.use('/api/post-meta', postMetaRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/postMeta-comments', postMetaCommentRoutes);

// Fully protected routes
app.use('/api/user', auth, userRoutes);
app.use('/api/user', auth, followRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ads', auth, adRoutes);
app.use('/api/affiliate', auth, affiliateRoutes);
app.use('/api/wallet', auth, walletRoutes);

// Telegram webhook route (no auth)
app.use(telegramWebhook); // ✅ Add this

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
