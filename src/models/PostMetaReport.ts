import mongoose, { Schema, Document } from 'mongoose';

export interface IPostMetaReport extends Document {
  postMetaId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const PostMetaReportSchema = new Schema<IPostMetaReport>(
  {
    postMetaId: { type: Schema.Types.ObjectId, ref: 'PostMeta', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' }
  },
  { timestamps: true }
);

export const PostMetaReport = mongoose.model<IPostMetaReport>('PostMetaReport', PostMetaReportSchema);
