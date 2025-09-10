import { Schema, model, Document, Types } from 'mongoose';

export interface IPostMetaFingerprint extends Document {
  postMetaId: Types.ObjectId;
  mediaType: 'image' | 'video' | 'audio' | 'text';
  hashes: { phash?: string[]; simhash?: string; audio?: string[] };
  embeddingsRef?: string;
  version: number;
  createdAt: Date;
}

const PostMetaFingerprintSchema = new Schema<IPostMetaFingerprint>(
  {
    postMetaId: { type: Schema.Types.ObjectId, ref: 'PostMeta', required: true, index: true },
    mediaType: { type: String, enum: ['image', 'video', 'audio', 'text'], required: true },
    hashes: {
      phash: [String],
      simhash: String,
      audio: [String]
    },
    embeddingsRef: String,
    version: { type: Number, default: 1 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PostMetaFingerprintSchema.index({ 'hashes.phash': 1 });
PostMetaFingerprintSchema.index({ 'hashes.simhash': 1 });

export const PostMetaFingerprint = model<IPostMetaFingerprint>(
  'PostMetaFingerprint',
  PostMetaFingerprintSchema
);
