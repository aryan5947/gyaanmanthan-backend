import express from 'express';
import cors from 'cors';
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

app.get('/health', (_req, res) => res.json({ ok: true }));

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
  app.listen(env.port, () => {
    console.log(`🚀 Server running on :${env.port} [${env.nodeEnv}]`);
  });
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
