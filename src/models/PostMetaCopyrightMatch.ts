import { Schema, model, Document, Types } from 'mongoose';

export interface IPostMetaCopyrightMatch extends Document {
  postMetaId: Types.ObjectId;
  refAssetId: Types.ObjectId;
  mediaType: 'image' | 'video' | 'audio' | 'text';
  confidence: number;
  engineScores?: Record<string, number>;
  decision: 'violation' | 'allow' | 'review';
  createdAt: Date;
}

const PostMetaCopyrightMatchSchema = new Schema<IPostMetaCopyrightMatch>(
  {
    postMetaId: { type: Schema.Types.ObjectId, ref: 'PostMeta', required: true, index: true },
    refAssetId: { type: Schema.Types.ObjectId, ref: 'ReferenceAsset', required: true, index: true },
    mediaType: { type: String, enum: ['image', 'video', 'audio', 'text'], required: true },
    confidence: { type: Number, required: true },
    engineScores: { type: Map, of: Number },
    decision: { type: String, enum: ['violation', 'allow', 'review'], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PostMetaCopyrightMatch = model<IPostMetaCopyrightMatch>(
  'PostMetaCopyrightMatch',
  PostMetaCopyrightMatchSchema
);
