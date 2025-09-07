// routes/followRoutes.ts
import { Router } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkMutualFollow
} from "../controllers/followController";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/follow", auth, followUser);
router.post("/unfollow", auth, unfollowUser);
router.get("/:userId/followers", auth, getFollowers);
router.get("/:userId/following", auth, getFollowing);
router.get("/mutual/check", auth, checkMutualFollow);

export default router;
