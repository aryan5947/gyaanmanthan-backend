import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import adRoutes from './routes/adRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
import walletRoutes from './routes/walletRoutes';

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/wallet', walletRoutes);

// Error handler
app.use(errorHandler);

async function start() {
  await connectDB();

  const PORT = env.port; // comes from env.ts (process.env.PORT || 8080)

  app.listen(PORT, () => {
    console.log(`🚀 Server running on :${PORT} [${env.nodeEnv}]`);
  });
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
