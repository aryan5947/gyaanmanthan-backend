import { Request, Response } from "express";
import { Follow } from "../models/Follow";

// ✅ Follow a user
export const followUser = async (req: Request, res: Response) => {
  try {
    const { userIdToFollow } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!userIdToFollow) {
      return res.status(400).json({ message: "Target user ID is required" });
    }
    if (currentUserId === userIdToFollow) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const existing = await Follow.findOne({
      follower: currentUserId,
      following: userIdToFollow,
    });
    if (existing) {
      return res.status(400).json({ message: "Already following" });
    }

    await Follow.create({ follower: currentUserId, following: userIdToFollow });
    res.json({ message: "Followed successfully" });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Unfollow a user
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { userIdToUnfollow } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!userIdToUnfollow) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    const deleted = await Follow.findOneAndDelete({
      follower: currentUserId,
      following: userIdToUnfollow,
    });

    if (!deleted) {
      return res.status(400).json({ message: "Not following this user" });
    }

    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Followers list with isMutual
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const followers = await Follow.find({ following: userId })
      .populate("follower", "id name username avatarUrl followersCount followingCount postsCount")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!currentUserId) {
      return res.json({ followers, page });
    }

    const myFollowingIds = new Set(
      (await Follow.find({ follower: currentUserId }).distinct("following")).map((id) =>
        id.toString()
      )
    );

    const result = await Promise.all(
      followers.map(async (f) => {
        const mutual =
          myFollowingIds.has(f.follower._id.toString()) &&
          !!(await Follow.exists({
            follower: f.follower._id,
            following: currentUserId,
          }));
        return { ...f, isMutual: mutual };
      })
    );

    res.json({ followers: result, page });
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Following list with isMutual
export const getFollowing = async (req: Request, res: Response) => {
  try {
    // Support shortcut route: if no param, use current user
    const { userId: paramUserId } = req.params;
    const currentUserId = req.user?.id;
    const targetUserId = paramUserId || currentUserId;

    if (!targetUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const following = await Follow.find({ follower: targetUserId })
      .populate("following", "id name username avatarUrl followersCount followingCount postsCount")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!currentUserId) {
      return res.json({ following, page });
    }

    const myFollowingIds = new Set(
      (await Follow.find({ follower: currentUserId }).distinct("following")).map((id) =>
        id.toString()
      )
    );

    const result = await Promise.all(
      following.map(async (f) => {
        const mutual =
          myFollowingIds.has(f.following._id.toString()) &&
          !!(await Follow.exists({
            follower: f.following._id,
            following: currentUserId,
          }));
        return { ...f, isMutual: mutual };
      })
    );

    res.json({ following: result, page });
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Lightweight Mutual follow check
export const checkMutualFollow = async (req: Request, res: Response) => {
  try {
    const { userIdA, userIdB } = req.query;

    if (!userIdA || !userIdB) {
      return res.status(400).json({ message: "Both user IDs are required" });
    }

    const [aFollowsB, bFollowsA] = await Promise.all([
      Follow.exists({ follower: userIdA, following: userIdB }),
      Follow.exists({ follower: userIdB, following: userIdA }),
    ]);

    res.json({
      aFollowsB: !!aFollowsB,
      bFollowsA: !!bFollowsA,
      mutual: !!aFollowsB && !!bFollowsA,
    });
  } catch (err) {
    console.error("Mutual follow check error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
