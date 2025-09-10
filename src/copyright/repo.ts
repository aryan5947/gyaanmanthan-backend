import { Model } from 'mongoose';
import { Post } from '../models/Post';
import { PostMeta } from '../models/PostMeta';

// Post-specific
import { PostFingerprint } from '../models/PostFingerprint';
import { PostCopyrightMatch } from '../models/PostCopyrightMatch';

// PostMeta-specific
import { PostMetaFingerprint } from '../models/PostMetaFingerprint';
import { PostMetaCopyrightMatch } from '../models/PostMetaCopyrightMatch';

// Shared
import { ReferenceAsset } from '../models/ReferenceAsset';

/**
 * Detects whether the given ID belongs to Post or PostMeta.
 * Returns { type, model } so we can route to correct collection.
 */
async function getTargetModel(
  postId: string
): Promise<{ type: 'post' | 'postMeta'; model: Model<any> }> {
  const metaExists = await PostMeta.exists({ _id: postId });
  if (metaExists) return { type: 'postMeta', model: PostMeta };

  const postExists = await Post.exists({ _id: postId });
  if (postExists) return { type: 'post', model: Post };

  throw new Error(`No Post or PostMeta found for ID: ${postId}`);
}

/**
 * Save fingerprint in correct collection based on post type.
 */
export async function saveFingerprint(
  postId: string,
  data: { mediaType: string; hashes: any; version: number }
) {
  const { type } = await getTargetModel(postId);

  if (type === 'postMeta') {
    await PostMetaFingerprint.create({ postMetaId: postId, ...data, createdAt: new Date() });
  } else {
    await PostFingerprint.create({ postId, ...data, createdAt: new Date() });
  }
}

/**
 * Find reference asset policy.
 */
export async function findRefPolicy(refId: string): Promise<'block' | 'track' | 'allow'> {
  const ref = await ReferenceAsset.findById(refId).lean();
  return ref?.policy || 'allow';
}

/**
 * Save match in correct collection based on post type.
 */
export async function saveMatch(
  postId: string,
  refAssetId: string,
  mediaType: string,
  score: number,
  decision: 'violation' | 'allow' | 'review'
) {
  const { type } = await getTargetModel(postId);

  if (type === 'postMeta') {
    await PostMetaCopyrightMatch.create({
      postMetaId: postId,
      refAssetId,
      mediaType,
      confidence: score,
      decision,
      createdAt: new Date()
    });
  } else {
    await PostCopyrightMatch.create({
      postId,
      refAssetId,
      mediaType,
      confidence: score,
      decision,
      createdAt: new Date()
    });
  }
}

/**
 * Update status in correct collection.
 */
export async function updatePostStatus(
  postId: string,
  status: 'active' | 'restricted' | 'blocked' | 'deleted',
  reason?: string,
  scanStatus?: 'pending' | 'passed' | 'failed' | 'disputed'
) {
  const { model } = await getTargetModel(postId);

  await model.updateOne(
    { _id: postId },
    {
      $set: {
        status,
        restrictionReason: reason || null,
        ...(scanStatus ? { copyrightScanStatus: scanStatus } : {})
      }
    }
  );
}
