import { Schema, model, Document, Types } from 'mongoose';

export interface IAffiliateEvent extends Document {
  user?: Types.ObjectId;    // who clicked (optional if anonymous)
  post?: Types.ObjectId;    // originating post
  targetUrl: string;        // affiliate or outbound link
  type: 'click' | 'conversion';
  meta?: Record<string, any>;
  createdAt: Date;
}

const affiliateEventSchema = new Schema<IAffiliateEvent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    targetUrl: { type: String, required: true },
    type: { type: String, enum: ['click', 'conversion'], required: true },
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AffiliateEvent = model<IAffiliateEvent>('AffiliateEvent', affiliateEventSchema);
