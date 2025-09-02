import { Schema, model, Document, Types } from 'mongoose';

export interface IPost extends Document {
  author: Types.ObjectId;
  content: string;
  images: string[];
  tags: string[];
  stats: {
    views: number;
    likes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    images: [{ type: String }],
    tags: [{ type: String, index: true }],
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Post = model<IPost>('Post', postSchema);
