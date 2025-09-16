import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { PostMeta } from '../models/PostMeta.js';
import { PostMetaReport } from '../models/PostMetaReport.js';
import { PostReport } from '../models/PostReport.js';
import { User } from '../models/User.js';

export interface AdminActionResult {
  ok: boolean;
  message: string;
}

/**
 * Ban a user by ID
 */
export async function banUser(userId: string): Promise<AdminActionResult> {
  const objectId = new mongoose.Types.ObjectId(userId);
  await User.updateOne({ _id: objectId }, { $set: { status: 'banned' } });
  return { ok: true, message: `User ${userId} banned 🚫` };
}

/**
 * Unban a user by ID
 */
export async function unbanUser(userId: string): Promise<AdminActionResult> {
  const objectId = new mongoose.Types.ObjectId(userId);
  await User.updateOne({ _id: objectId }, { $set: { status: 'active' } });
  return { ok: true, message: `User ${userId} unbanned ✅` };
}

/**
 * Delete a post by ID (also handles PostMeta)
 */
export async function deletePost(postId: string): Promise<AdminActionResult> {
  const objectId = new mongoose.Types.ObjectId(postId);

  // Soft delete in Post
  await Post.updateOne(
    { _id: objectId },
    { $set: { status: 'deleted', updatedAt: new Date() } }
  );

  // Soft delete in PostMeta
  await PostMeta.updateOne(
    { _id: objectId },
    { $set: { status: 'deleted', updatedAt: new Date() } }
  );

  return { ok: true, message: `Post ${postId} deleted 🗑️` };
}

/**
 * Resolve a post report by ID
 */
export async function resolveReport(reportId: string): Promise<AdminActionResult> {
  const objectId = new mongoose.Types.ObjectId(reportId);
  await PostReport.updateOne(
    { _id: objectId },
    { $set: { status: 'resolved', updatedAt: new Date() } }
  );
  return { ok: true, message: `Post Report ${reportId} resolved ✅` };
}

/**
 * Resolve a postMeta report by ID
 */
export async function resolveMetaReport(metaReportId: string): Promise<AdminActionResult> {
  const objectId = new mongoose.Types.ObjectId(metaReportId);
  await PostMetaReport.updateOne(
    { _id: objectId },
    { $set: { status: 'resolved', updatedAt: new Date() } }
  );
  return { ok: true, message: `PostMeta Report ${metaReportId} resolved ✅` };
}

/**
 * Get site-wide stats for dashboard or Telegram
 */
export async function getSiteStats(): Promise<string> {
  const users = await User.countDocuments();
  const posts = await Post.countDocuments();
  const reportsOpen = await PostReport.countDocuments({ status: 'open' });
  const reportsTotal = await PostReport.countDocuments();
  const metaReportsOpen = await PostMetaReport.countDocuments({ status: 'open' });
  const metaReportsTotal = await PostMetaReport.countDocuments();

  return [
    `👥 Users: ${users}`,
    `📝 Posts: ${posts}`,
    `🚨 Reports: ${reportsOpen}/${reportsTotal}`,
    `🧩 Meta Reports: ${metaReportsOpen}/${metaReportsTotal}`
  ].join('\n');
}
