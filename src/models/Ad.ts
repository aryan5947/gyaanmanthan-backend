import { Schema, model, Document } from 'mongoose';

export interface IAd extends Document {
  title: string;
  body?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl: string;
  active: boolean;
  priority: number;
  targeting: { tags: string[]; country?: string };
  stats: { impressions: number; clicks: number };
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new Schema<IAd>(
  {
    title: { type: String, required: true },
    body: String,
    imageUrl: String,
    ctaText: String,
    ctaUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    targeting: {
      tags: [{ type: String }],
      country: String,
    },
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Ad = model<IAd>('Ad', adSchema);
