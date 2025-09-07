import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  bio?: string;
  plan: 'free' | 'partner';
  walletBalance: number;
  role: 'user' | 'admin' | 'moderator' | 'banned'; // ✅ RBAC ready

  followersCount: number;   // ✅ total followers
  followingCount: number;   // ✅ total following
  postsCount: number;       // ✅ total posts

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
    bio: String,
    plan: { type: String, enum: ['free', 'partner'], default: 'free' },
    walletBalance: { type: Number, default: 0 },

    // ✅ RBAC role
    role: { type: String, enum: ['user', 'admin', 'moderator', 'banned'], default: 'user' },

    // 📊 Social graph counters
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
