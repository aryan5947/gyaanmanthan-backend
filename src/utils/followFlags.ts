import { Follow } from "../models/Follow";
import { Types } from "mongoose";

/**
 * Compute follow flags between current user and target user
 */
export async function computeFollowFlags(
  currentUserId: string | Types.ObjectId,
  targetUserId: string | Types.ObjectId
) {
  const isSelf = String(currentUserId) === String(targetUserId);

  if (isSelf) {
    return {
      isFollowing: false,
      isMutual: false,
      canFollow: false,
    };
  }

  const [currentFollowsTarget, targetFollowsCurrent] = await Promise.all([
    Follow.exists({ follower: currentUserId, following: targetUserId }),
    Follow.exists({ follower: targetUserId, following: currentUserId }),
  ]);

  const isFollowing = !!currentFollowsTarget;
  const isMutual = !!currentFollowsTarget && !!targetFollowsCurrent;
  const canFollow = !isFollowing; // only if not already following

  return { isFollowing, isMutual, canFollow };
}
