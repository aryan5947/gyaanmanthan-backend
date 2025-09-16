import mongoose, { Schema, Document } from 'mongoose';

export interface IPostReport extends Document {
  postId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const PostReportSchema = new Schema<IPostReport>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' }
  },
  { timestamps: true }
);

export const PostReport = mongoose.model<IPostReport>('PostReport', PostReportSchema);
