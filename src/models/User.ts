import { Schema, model, Document } from 'mongoose';

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

  followersCount: number;        // ✅ total followers
  followingCount: number;        // ✅ total following
  postsCount: number;            // ✅ total normal posts
  postMetaCount: number;         // ✅ total postMeta created

  commentsCount: number;         // ✅ total comments on Posts
  threadsCount: number;          // ✅ total root-level comments on Posts
  postMetaCommentsCount: number; // ✅ total comments on PostMeta
  postMetaThreadsCount: number;  // ✅ total root-level comments on PostMeta

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: String,
    bannerUrl: String, // ✅ new banner field
    bio: String,
    plan: { type: String, enum: ['free', 'partner'], default: 'free' },
    walletBalance: { type: Number, default: 0 },

    // ✅ RBAC role
    role: { type: String, enum: ['user', 'admin', 'moderator', 'banned'], default: 'user' },

    // 📊 Social graph counters
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    postMetaCount: { type: Number, default: 0 },

    // 🗨️ Comment counters
    commentsCount: { type: Number, default: 0 },         // Post comments
    threadsCount: { type: Number, default: 0 },          // Root-level Post comments
    postMetaCommentsCount: { type: Number, default: 0 }, // PostMeta comments
    postMetaThreadsCount: { type: Number, default: 0 },  // Root-level PostMeta comments
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
