import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actor?: Types.ObjectId; // jisne action kiya (User ref)
  actorType: 'user' | 'system' | 'admin' | 'moderator'; // kis type ka actor
  action: string; // e.g. 'LOGIN', 'POST_DELETE', 'WALLET_TOPUP'
  target?: Types.ObjectId; // jis par action hua (User/Post/etc.)
  targetModel?: string; // target ka model name e.g. 'User', 'Post'
  description?: string; // human-readable summary
  ip?: string; // IP address if available
  userAgent?: string; // device/browser info
  meta?: Record<string, any>; // extra data (amount, reason, etc.)
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorType: { type: String, enum: ['user', 'system', 'admin', 'moderator'], required: true },
    action: { type: String, required: true, index: true },
    target: { type: Schema.Types.ObjectId },
    targetModel: { type: String },
    description: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    meta: Schema.Types.Mixed
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
