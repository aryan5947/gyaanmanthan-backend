import { User } from '../../models/User';

/**
 * Sends a notification to the content owner.
 * This is a pluggable service — replace console.log with actual email/push logic.
 */
export async function notifyUser(
  postId: string,
  payload: { type: string; message: string }
) {
  try {
    // Find the user who owns this post/postMeta
    let owner = await findOwnerFromPost(postId);
    if (!owner) {
      owner = await findOwnerFromPostMeta(postId);
    }

    if (!owner) {
      console.warn(`No owner found for postId ${postId}, skipping notification`);
      return;
    }

    // TODO: Replace with actual email/push/SMS integration
    console.log(`📢 Notify ${owner.email} (${owner._id}): [${payload.type}] ${payload.message}`);

    // Example: Email
    // await emailService.send({
    //   to: owner.email,
    //   subject: 'Content Policy Update',
    //   text: payload.message
    // });

    // Example: Push
    // await pushService.send(owner.deviceToken, payload.message);

  } catch (err) {
    console.error('Error in notifyUser:', err);
  }
}

/**
 * Helper: Find owner from Post
 */
async function findOwnerFromPost(postId: string) {
  // ESM dynamic import requires .js extension in Node16/Next mode
  const { Post } = await import('../../models/Post.js');
  const post = await Post.findById(postId).select('authorId').lean();
  if (!post) return null;
  return User.findById(post.authorId).select('email deviceToken').lean();
}

/**
 * Helper: Find owner from PostMeta
 */
async function findOwnerFromPostMeta(postId: string) {
  // ESM dynamic import requires .js extension in Node16/Next mode
  const { PostMeta } = await import('../../models/PostMeta.js');
  const postMeta = await PostMeta.findById(postId).select('authorId').lean();
  if (!postMeta) return null;
  return User.findById(postMeta.authorId).select('email deviceToken').lean();
}
