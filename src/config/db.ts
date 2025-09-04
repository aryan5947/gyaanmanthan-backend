// src/config/db.ts
import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectDB() {
  mongoose.set('strictQuery', true);

  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10, // pool warm rakho
      serverSelectionTimeoutMS: 5000, // fail fast if DB unreachable
    });

    isConnected = conn.connection.readyState === 1;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}
