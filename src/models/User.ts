import { Schema, model, Document } from 'mongoose';

/**
 * IUser — TypeScript interface for User document
 * Ensures type safety across controllers, middleware, and services
 */
export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  bannerUrl?: string; // ✅ optional banner image
  bio?: string;
  plan: 'free' | 'partner';
  walletBalance: number;
  role: 'user' | 'admin' | 'moderator' | 'banned'; // ✅ RBAC ready

  // 📊 Social graph counters
  followersCount: number;
  followingCount: number;
  postsCount: number;
  postMetaCount: number;

  // 🗨️ Comment counters
  commentsCount: number;         
  threadsCount: number;          
  postMetaCommentsCount: number; 
  postMetaThreadsCount: number;  

  // 🏅 Golden tick status
  isGoldenVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * userSchema — Mongoose schema definition
 * Backward-compatible, future-proof, and optimized for scale
 */
const userSchema = new Schema<IUser>(
  {
    // 🧾 Basic profile
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },

    // 🖼 Media
    avatarUrl: { type: String },
    bannerUrl: { type: String }, // ✅ new banner field
    bio: { type: String, trim: true },

    // 💳 Account & plan
    plan: { type: String, enum: ['free', 'partner'], default: 'free' },
    walletBalance: { type: Number, default: 0 },

    // 🛡 RBAC role
    role: { type: String, enum: ['user', 'admin', 'moderator', 'banned'], default: 'user', index: true },

    // 📊 Social graph counters
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    postMetaCount: { type: Number, default: 0 },

    // 🗨️ Comment counters
    commentsCount: { type: Number, default: 0 },         
    threadsCount: { type: Number, default: 0 },          
    postMetaCommentsCount: { type: Number, default: 0 }, 
    postMetaThreadsCount: { type: Number, default: 0 },  

    // 🏅 Golden tick status
    isGoldenVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
