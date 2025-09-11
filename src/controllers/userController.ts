import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Post } from '../models/Post';
import { PostMeta } from '../models/PostMeta';
import { Like } from '../models/LikePostMeta';
import { PostLike } from '../models/PostLike';
import { SavedPostMeta } from '../models/SavedPostMeta';
import { Comment } from '../models/Comment';
import { PostMetaComment } from '../models/postMetaComment';
import { SavedPost } from '../models/SavedPost';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// --- GET CURRENT LOGGED-IN USER (FULL PROFILE) ---
export const getMeWithFullProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // --- Stats counts ---
    const [
      postMetaLikesCount,
      postLikesCount,
      postMetaSavesCount,
      postSavesCount,
      postCommentsCount,
      postMetaCommentsCount,
      postThreadsCount,
      postMetaThreadsCount
    ] = await Promise.all([
      Like.countDocuments({ userId }),
      PostLike.countDocuments({ userId }),
      SavedPostMeta.countDocuments({ userId }),
      SavedPost.countDocuments({ userId }),
      Comment.countDocuments({ authorId: userId }),
      PostMetaComment.countDocuments({ authorId: userId }),
      Comment.countDocuments({ authorId: userId, parentId: null }),
      PostMetaComment.countDocuments({ authorId: userId, parentId: null })
    ]);

    const totalLikesCount = postMetaLikesCount + postLikesCount;
    const totalSavesCount = postMetaSavesCount + postSavesCount;
    const totalCommentsCount = postCommentsCount + postMetaCommentsCount;
    const totalThreadsCount = postThreadsCount + postMetaThreadsCount;

    // --- Own content ---
    const posts = await Post.find({ authorId: userId }).sort({ createdAt: -1 }).lean();
    const postMetas = await PostMeta.find({ authorId: userId }).sort({ createdAt: -1 }).lean();

    // --- Saved items ---
    const savedPostMetaRefs = await SavedPostMeta.find({ userId }).select('postMetaId').lean();
    const savedPostMetas = await PostMeta.find({ _id: { $in: savedPostMetaRefs.map(r => r.postMetaId) } }).lean();

    const savedPostRefs = await SavedPost.find({ userId }).select('postId').lean();
    const savedPosts = await Post.find({ _id: { $in: savedPostRefs.map(r => r.postId) } }).lean();

    // --- Liked items ---
    const likedPostMetaRefs = await Like.find({ userId }).select('postMetaId').lean();
    const likedPostMetas = await PostMeta.find({ _id: { $in: likedPostMetaRefs.map(r => r.postMetaId) } }).lean();

    const likedPostRefs = await PostLike.find({ userId }).select('postId').lean();
    const likedPosts = await Post.find({ _id: { $in: likedPostRefs.map(r => r.postId) } }).lean();

    // --- Latest comments (top 5) ---
    const latestPostComments = await Comment.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const latestPostMetaComments = await PostMetaComment.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const latestComments = [...latestPostComments, ...latestPostMetaComments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // --- Combined timeline ---
    const combinedTimeline = [
      ...posts.map(p => ({ ...p, type: 'post' })),
      ...postMetas.map(pm => ({ ...pm, type: 'postMeta' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
          threads: totalThreadsCount
        },
        posts,
        postMetas,
        savedItems: [...savedPosts, ...savedPostMetas],
        likedItems: [...likedPosts, ...likedPostMetas],
        combinedTimeline,
        latestComments
      }
    });
  } catch (error) {
    console.error('getMeWithFullProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- GET USER PROFILE BY ID (FULL PROFILE + FOLLOW FLAGS) ---
export const getProfileWithFullProfile = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId).select('-passwordHash').lean();
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

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

    // --- Stats counts ---
    const [
      postMetaLikesCount,
      postLikesCount,
      postMetaSavesCount,
      postSavesCount,
      postCommentsCount,
      postMetaCommentsCount,
      postThreadsCount,
      postMetaThreadsCount
    ] = await Promise.all([
      Like.countDocuments({ userId: targetUserId }),
      PostLike.countDocuments({ userId: targetUserId }),
      SavedPostMeta.countDocuments({ userId: targetUserId }),
      SavedPost.countDocuments({ userId: targetUserId }),
      Comment.countDocuments({ authorId: targetUserId }),
      PostMetaComment.countDocuments({ authorId: targetUserId }),
      Comment.countDocuments({ authorId: targetUserId, parentId: null }),
      PostMetaComment.countDocuments({ authorId: targetUserId, parentId: null })
    ]);

    const totalLikesCount = postMetaLikesCount + postLikesCount;
    const totalSavesCount = postMetaSavesCount + postSavesCount;
    const totalCommentsCount = postCommentsCount + postMetaCommentsCount;
    const totalThreadsCount = postThreadsCount + postMetaThreadsCount;

    // --- Content ---
    const posts = await Post.find({ authorId: targetUserId }).sort({ createdAt: -1 }).lean();
    const postMetas = await PostMeta.find({ authorId: targetUserId }).sort({ createdAt: -1 }).lean();

    // --- Saved items ---
    const savedPostMetaRefs = await SavedPostMeta.find({ userId: targetUserId }).select('postMetaId').lean();
    const savedPostMetas = await PostMeta.find({ _id: { $in: savedPostMetaRefs.map(r => r.postMetaId) } }).lean();

    const savedPostRefs = await SavedPost.find({ userId: targetUserId }).select('postId').lean();
    const savedPosts = await Post.find({ _id: { $in: savedPostRefs.map(r => r.postId) } }).lean();

    // --- Liked items ---
    const likedPostMetaRefs = await Like.find({ userId: targetUserId }).select('postMetaId').lean();
    const likedPostMetas = await PostMeta.find({ _id: { $in: likedPostMetaRefs.map(r => r.postMetaId) } }).lean();

    const likedPostRefs = await PostLike.find({ userId: targetUserId }).select('postId').lean();
    const likedPosts = await Post.find({ _id: { $in: likedPostRefs.map(r => r.postId) } }).lean();

    // --- Latest comments (top 5) ---
    const latestPostComments = await Comment.find({ authorId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const latestPostMetaComments = await PostMetaComment.find({ authorId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const latestComments = [...latestPostComments, ...latestPostMetaComments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // --- Combined timeline ---
    const combinedTimeline = [
      ...posts.map(p => ({ ...p, type: 'post' })),
      ...postMetas.map(pm => ({ ...pm, type: 'postMeta' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
          threads: totalThreadsCount
        },
        posts,
        postMetas,
        savedItems: [...savedPosts, ...savedPostMetas],
        likedItems: [...likedPosts, ...likedPostMetas],
        combinedTimeline,
        latestComments
      }
    });
  } catch (error) {
    console.error('getProfileWithFullProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
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
    // ✅ Multiple file fields: avatar + banner
    const files = (req as any).files as {
      avatar?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    };

    // Avatar upload
    if (files?.avatar?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.avatar[0].buffer,
        files.avatar[0].mimetype,
        'avatars'
      );
      updates.avatarUrl = up.url;
    }

    // Banner upload
    if (files?.banner?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.banner[0].buffer,
        files.banner[0].mimetype,
        'banners'
      );
      updates.bannerUrl = up.url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      updates,
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- DELETE USER PROFILE ---
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await Promise.all([
      Post.deleteMany({ authorId: userId }),
      PostMeta.deleteMany({ authorId: userId }),
      Like.deleteMany({ userId }),
      PostLike.deleteMany({ userId }),
      SavedPostMeta.deleteMany({ userId }),
      SavedPost.deleteMany({ userId }),
      Comment.deleteMany({ authorId: userId }),
      PostMetaComment.deleteMany({ authorId: userId }),
      Follow.deleteMany({ follower: userId }),
      Follow.deleteMany({ following: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Profile and all related data deleted successfully' });
  } catch (error) {
    console.error('DeleteProfile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
