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
import { auth } from './middleware/auth'; // Auth middleware ko import karein

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import adRoutes from './routes/adRoutes';
import commentRoutes from "./routes/commentRoutes";
import affiliateRoutes from './routes/affiliateRoutes';
import walletRoutes from './routes/walletRoutes';

const app = express();


// --- SECURITY MIDDLEWARES ---

// 1. Set security-related HTTP response headers
app.use(helmet());

// 2. Configure CORS (Cross-Origin Resource Sharing)
// Production ke liye '*' use karna aacha nahi hai. Sirf apne trusted domains ko allow karein.
const allowedOrigins = [
  'http://localhost:3000', // Aapka local frontend (React)
  'http://localhost:5173', // Aapka local frontend (Vite)
  'https://your-frontend-domain.com' // Aapka production frontend domain yahan daalein
];

app.use(cors({
  origin: function (origin, callback) {
    // Agar request ka origin allowed list mein hai, to use allow karein
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Cookies ya authorization headers ke liye
}));


// 3. Rate Limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100, // Har IP se 15 min mein 100 requests allow karein
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Saare API routes par rate limiter lagayein
app.use('/api', apiLimiter);


// --- CORE MIDDLEWARES ---

// 4. Body parser with a size limit
app.use(express.json({ limit: '2mb' }));

// 5. Sanitize user-supplied data to prevent NoSQL injection attacks
// Ise hamesha json() or urlencoded() ke baad use karein.
app.use(mongoSanitize());

// 6. HTTP request logger
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// 7. Serve favicon
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));


// --- ROUTES ---

// Health check endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

// Public routes (inhe access karne ke liye login zaroori nahi hai)
app.use('/api/auth', authRoutes);

// Protected routes (inhe access karne ke liye authentication zaroori hai)
// Humne 'auth' middleware ko in sabhi routes se pehle laga diya hai.
app.use('/api/user', auth, userRoutes);
app.use('/api/posts', auth, postRoutes);
app.use('/api/ads', auth, adRoutes);
app.use("/api/comments", auth, commentRoutes);
app.use('/api/affiliate', auth, affiliateRoutes);
app.use('/api/wallet', auth, walletRoutes);


// --- ERROR HANDLING ---

// Error handler middleware (hamesha sabse aakhir mein hona chahiye)
app.use(errorHandler);


// --- SERVER START ---

async function start() {
  await connectDB();

  const PORT = env.port; // env.ts se (process.env.PORT || 8080)

  app.listen(PORT, () => {
    console.log(`🚀 Server running on :${PORT} [${env.nodeEnv}]`);
  });
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});

