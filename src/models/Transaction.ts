import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  user: Types.ObjectId;          // recipient
  fromUser?: Types.ObjectId;     // tipper (optional)
  type: 'tip' | 'payout' | 'sponsor';
  amount: number;
  platformCommission: number;
  meta?: Record<string, any>;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['tip', 'payout', 'sponsor'], required: true },
    amount: { type: Number, required: true },
    platformCommission: { type: Number, required: true, default: 0 },
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
