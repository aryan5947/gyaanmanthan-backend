import { updatePostStatus } from '../repo';
import { notifyUser } from './notify'; // optional: tumhare notification service ka import

/**
 * Enforces a policy decision by updating DB and triggering side-effects.
 */
export async function enforceDecision(
  postId: string,
  decision: 'allow' | 'violation' | 'review',
  reason?: string
) {
  if (decision === 'allow') {
    // Mark scan as passed
    await updatePostStatus(postId, 'active', undefined, 'passed');
    return;
  }

  if (decision === 'violation') {
    // Restrict or block content
    await updatePostStatus(postId, 'restricted', reason || 'Copyright violation detected', 'failed');

    // Optional: remove infringing media from storage/CDN here
    // await removeMediaFiles(postId);

    // Optional: notify content owner
    try {
      await notifyUser(postId, {
        type: 'copyright_violation',
        message: reason || 'Your content was restricted due to copyright violation.'
      });
    } catch (err) {
      console.error('Error notifying user:', err);
    }
    return;
  }

  if (decision === 'review') {
    // Flag for manual review
    await updatePostStatus(postId, 'active', reason || 'Content flagged for review', 'pending');

    // Optional: notify moderators
    // await notifyModerators(postId, reason);
  }
}
