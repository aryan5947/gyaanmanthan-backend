import { Request, Response } from "express";
import { Follow } from "../models/Follow";

// ✅ Follow a user
export const followUser = async (req: Request, res: Response) => {
  try {
    const { userIdToFollow } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
    if (currentUserId === userIdToFollow) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    await Follow.create({ follower: currentUserId, following: userIdToFollow });
    res.json({ message: "Followed successfully" });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already following" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Unfollow a user
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { userIdToUnfollow } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });

    await Follow.findOneAndDelete({ follower: currentUserId, following: userIdToUnfollow });
    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Followers list with isMutual
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const followers = await Follow.find({ following: userId })
      .populate("follower", "id name username avatarUrl followersCount followingCount postsCount")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!currentUserId) {
      return res.json({ followers, page });
    }

    const myFollowingIds = new Set(
      (await Follow.find({ follower: currentUserId }).distinct("following")).map(id => id.toString())
    );

    const result = await Promise.all(
      followers.map(async f => {
        const mutual = myFollowingIds.has(f.follower._id.toString()) &&
          !!(await Follow.exists({ follower: f.follower._id, following: currentUserId }));
        return { ...f, isMutual: mutual };
      })
    );

    res.json({ followers: result, page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Following list with isMutual
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const following = await Follow.find({ follower: userId })
      .populate("following", "id name username avatarUrl followersCount followingCount postsCount")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!currentUserId) {
      return res.json({ following, page });
    }

    const myFollowingIds = new Set(
      (await Follow.find({ follower: currentUserId }).distinct("following")).map(id => id.toString())
    );

    const result = await Promise.all(
      following.map(async f => {
        const mutual = myFollowingIds.has(f.following._id.toString()) &&
          !!(await Follow.exists({ follower: f.following._id, following: currentUserId }));
        return { ...f, isMutual: mutual };
      })
    );

    res.json({ following: result, page });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
