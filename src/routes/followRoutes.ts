import { Router, Request, Response } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkMutualFollow
} from "../controllers/followController";

const router = Router();

// ✅ Follow a user
router.post("/follow", followUser);

// ✅ Unfollow a user
router.post("/unfollow", unfollowUser);

// ✅ Shortcut: current user's following list
router.get(
  "/following",
  (req: Request<{ userId: string }>, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.params.userId = req.user.id; // TS-safe after guard
    return getFollowing(req, res);
  }
);

// ✅ Followers list
router.get("/:userId/followers", getFollowers);

// ✅ Following list
router.get("/:userId/following", getFollowing);

// ✅ Mutual follow check
router.get("/mutual/check", checkMutualFollow);

export default router;
