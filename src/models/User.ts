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
  bannerUrl?: string;
  bio?: string;
  plan: 'free' | 'partner';
  walletBalance: number;
  role: 'user' | 'admin' | 'moderator' | 'banned';

  followersCount: number;
  followingCount: number;
  postsCount: number;
  postMetaCount: number;

  commentsCount: number;         
  threadsCount: number;          
  postMetaCommentsCount: number; 
  postMetaThreadsCount: number;  

  isGoldenVerified: boolean;

  telegramChatId?: number | null;
  telegramUsername?: string | null;
  telegramLinkedAt?: Date | null;

  sessionVersion?: number; // For force logout management
  lastAdminActionAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    bannerUrl: { type: String },
    bio: { type: String, trim: true },
    plan: { type: String, enum: ['free', 'partner'], default: 'free' },
    walletBalance: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin', 'moderator', 'banned'], default: 'user', index: true },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    postMetaCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },         
    threadsCount: { type: Number, default: 0 },          
    postMetaCommentsCount: { type: Number, default: 0 }, 
    postMetaThreadsCount: { type: Number, default: 0 },  
    isGoldenVerified: { type: Boolean, default: false },
    telegramChatId: { type: Number, default: null, index: true },
    telegramUsername: { type: String, default: null },
    telegramLinkedAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    lastAdminActionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);