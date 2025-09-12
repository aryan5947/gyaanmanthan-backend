// controllers/userController.ts
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { User } from "../models/User";
import { Follow } from "../models/Follow";
import { Post } from "../models/Post";
import { PostMeta } from "../models/PostMeta";
import { Like as LikePostMeta } from "../models/LikePostMeta";
import { PostLike } from "../models/PostLike";
import { SavedPostMeta } from "../models/SavedPostMeta";
import { SavedPost } from "../models/SavedPost";
import { Comment } from "../models/Comment";
import { PostMetaComment } from "../models/postMetaComment";
import { Notification } from "../models/Notification";
import { uploadBufferToCloudinary } from "../utils/cloudinary";

// --- GET CURRENT LOGGED-IN USER (FULL PROFILE) ---
export const getMeWithFullProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const [
      followersList,
      followingList,
      postMetaLikesCount,
      postLikesCount,
      postMetaSavesCount,
      postSavesCount,
      postCommentsCount,
      postMetaCommentsCount,
      postThreadsCount,
      postMetaThreadsCount,
      posts,
      postMetas,
      savedPostMetaRefs,
      savedPostRefs,
      likedPostMetaRefs,
      likedPostRefs,
      latestPostComments,
      latestPostMetaComments,
      notifications,
    ] = await Promise.all([
      Follow.find({ following: userId })
        .populate("follower", "name username avatarUrl")
        .lean(),
      Follow.find({ follower: userId })
        .populate("following", "name username avatarUrl")
        .lean(),
      LikePostMeta.countDocuments({ userId }),
      PostLike.countDocuments({ userId }),
      SavedPostMeta.countDocuments({ userId }),
      SavedPost.countDocuments({ userId }),
      Comment.countDocuments({ authorId: userId }),
      PostMetaComment.countDocuments({ authorId: userId }),
      Comment.countDocuments({ authorId: userId, parentId: null }),
      PostMetaComment.countDocuments({ authorId: userId, parentId: null }),
      Post.find({ authorId: userId }).sort({ createdAt: -1 }).lean(),
      PostMeta.find({ authorId: userId }).sort({ createdAt: -1 }).lean(),
      SavedPostMeta.find({ userId }).select("postMetaId").lean(),
      SavedPost.find({ userId }).select("postId").lean(),
      LikePostMeta.find({ userId }).select("postMetaId").lean(),
      PostLike.find({ userId }).select("postId").lean(),
      Comment.find({ authorId: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      PostMetaComment.find({ authorId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).lean(),
    ]);

    const totalLikesCount = postMetaLikesCount + postLikesCount;
    const totalSavesCount = postMetaSavesCount + postSavesCount;
    const totalCommentsCount = postCommentsCount + postMetaCommentsCount;
    const totalThreadsCount = postThreadsCount + postMetaThreadsCount;

    const savedPostMetas = await PostMeta.find({
      _id: { $in: savedPostMetaRefs.map((r) => r.postMetaId) },
    }).lean();
    const savedPosts = await Post.find({
      _id: { $in: savedPostRefs.map((r) => r.postId) },
    }).lean();
    const likedPostMetas = await PostMeta.find({
      _id: { $in: likedPostMetaRefs.map((r) => r.postMetaId) },
    }).lean();
    const likedPosts = await Post.find({
      _id: { $in: likedPostRefs.map((r) => r.postId) },
    }).lean();

    const latestComments = [...latestPostComments, ...latestPostMetaComments]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    const combinedTimeline = [
      ...posts.map((p) => ({ ...p, type: "post" })),
      ...postMetas.map((pm) => ({ ...pm, type: "postMeta" })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({
      user: {
        ...user,
        stats: {
          posts: user.postsCount,
          followers: user.followersCount,
          following: user.followingCount,
          likes: totalLikesCount,
          saves: totalSavesCount,
          comments: totalCommentsCount,
          threads: totalThreadsCount,
        },
        followersList: followersList.map((f) => f.follower),
        followingList: followingList.map((f) => f.following),
        posts,
        postMetas,
        savedPosts,
        savedPostMetas,
        likedPosts,
        likedPostMetas,
        combinedTimeline,
        latestComments,
        notifications,
      },
    });
  } catch (error) {
    console.error("getMeWithFullProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- GET USER PROFILE BY ID ---
export const getProfileWithFullProfile = async (
  req: Request,
  res: Response
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId)
      .select("-passwordHash")
      .lean();
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    let isFollowing = false;
    let isMutual = false;
    if (req.user && req.user.id.toString() !== targetUser._id.toString()) {
      const [currentFollowsTarget, targetFollowsCurrent] = await Promise.all([
        Follow.exists({ follower: req.user.id, following: targetUser._id }),
        Follow.exists({ follower: targetUser._id, following: req.user.id }),
      ]);
      isFollowing = !!currentFollowsTarget;
      isMutual = !!currentFollowsTarget && !!targetFollowsCurrent;
    }

    const [
      followersList,
      followingList,
      postMetaLikesCount,
      postLikesCount,
      postMetaSavesCount,
      postSavesCount,
      postCommentsCount,
      postMetaCommentsCount,
      postThreadsCount,
      postMetaThreadsCount,
      posts,
      postMetas,
      savedPostMetaRefs,
      savedPostRefs,
      likedPostMetaRefs,
      likedPostRefs,
      latestPostComments,
      latestPostMetaComments,
    ] = await Promise.all([
      Follow.find({ following: targetUserId })
        .populate("follower", "name username avatarUrl")
        .lean(),
      Follow.find({ follower: targetUserId })
        .populate("following", "name username avatarUrl")
        .lean(),
      LikePostMeta.countDocuments({ userId: targetUserId }),
      PostLike.countDocuments({ userId: targetUserId }),
      SavedPostMeta.countDocuments({ userId: targetUserId }),
      SavedPost.countDocuments({ userId: targetUserId }),
      Comment.countDocuments({ authorId: targetUserId }),
      PostMetaComment.countDocuments({ authorId: targetUserId }),
      Comment.countDocuments({ authorId: targetUserId, parentId: null }),
      PostMetaComment.countDocuments({
        authorId: targetUserId,
        parentId: null,
      }),
      Post.find({ authorId: targetUserId }).sort({ createdAt: -1 }).lean(),
      PostMeta.find({ authorId: targetUserId }).sort({ createdAt: -1 }).lean(),
      SavedPostMeta.find({ userId: targetUserId }).select("postMetaId").lean(),
      SavedPost.find({ userId: targetUserId }).select("postId").lean(),
      LikePostMeta.find({ userId: targetUserId }).select("postMetaId").lean(),
      PostLike.find({ userId: targetUserId }).select("postId").lean(),
      Comment.find({ authorId: targetUserId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      PostMetaComment.find({ authorId: targetUserId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalLikesCount = postMetaLikesCount + postLikesCount;
    const totalSavesCount = postMetaSavesCount + postSavesCount;
    const totalCommentsCount = postCommentsCount + postMetaCommentsCount;
    const totalThreadsCount = postThreadsCount + postMetaThreadsCount;

    const savedPostMetas = await PostMeta.find({
      _id: { $in: savedPostMetaRefs.map((r) => r.postMetaId) },
    }).lean();
    const savedPosts = await Post.find({
      _id: { $in: savedPostRefs.map((r) => r.postId) },
    }).lean();
    const likedPostMetas = await PostMeta.find({
      _id: { $in: likedPostMetaRefs.map((r) => r.postMetaId) },
    }).lean();
    const likedPosts = await Post.find({
      _id: { $in: likedPostRefs.map((r) => r.postId) },
    }).lean();

    const latestComments = [...latestPostComments, ...latestPostMetaComments]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    const combinedTimeline = [
      ...posts.map((p) => ({ ...p, type: "post" })),
      ...postMetas.map((pm) => ({ ...pm, type: "postMeta" })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({
      user: {
        ...targetUser,
        isFollowing,
        isMutual,
        stats: {
          posts: targetUser.postsCount,
          followers: targetUser.followersCount,
          following: targetUser.followingCount,
          likes: totalLikesCount,
          saves: totalSavesCount,
          comments: totalCommentsCount,
          threads: totalThreadsCount,
        },
        followersList: followersList.map((f) => f.follower),
        followingList: followingList.map((f) => f.following),
        posts,
        postMetas,
        savedPosts,
        savedPostMetas,
        likedPosts,
        likedPostMetas,
        combinedTimeline,
        latestComments,
      },
    });
  } catch (error) {
    console.error("getProfileWithFullProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- UPDATE USER PROFILE ---
export const updateProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, bio, phone, dob, gender, website, location } = req.body;
  const updates: any = {};

  if (name) updates.name = name;
  if (bio) updates.bio = bio;
  if (phone) updates.phone = phone;
  if (dob) updates.dob = dob;
  if (gender) updates.gender = gender;
  if (website) updates.website = website;
  if (location) updates.location = location;

  try {
    const files = (req as any).files as {
      avatar?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    };

    if (files?.avatar?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.avatar[0].buffer,
        files.avatar[0].mimetype,
        "avatars"
      );
      updates.avatarUrl = up.url;
    }

    if (files?.banner?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.banner[0].buffer,
        files.banner[0].mimetype,
        "banners"
      );
      updates.bannerUrl = up.url;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user!.id, updates, {
      new: true,
    }).select("-passwordHash");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- DELETE USER PROFILE ---
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Promise.all([
      Post.deleteMany({ authorId: userId }),
      PostMeta.deleteMany({ authorId: userId }),
      LikePostMeta.deleteMany({ userId }),
      PostLike.deleteMany({ userId }),
      SavedPostMeta.deleteMany({ userId }),
      SavedPost.deleteMany({ userId }),
      Comment.deleteMany({ authorId: userId }),
      PostMetaComment.deleteMany({ authorId: userId }),
      Follow.deleteMany({ follower: userId }),
      Follow.deleteMany({ following: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({ message: "Profile and all related data deleted successfully" });
  } catch (error) {
    console.error("DeleteProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
