// src/models/Follow.ts
import { Schema, model, Document, Types } from "mongoose";
import { User } from "./User";
import { withTypedMiddleware } from "../utils/withTypedMiddleware";
import { createNotification } from "../utils/createNotification";

export interface IFollow extends Document {
  follower: Types.ObjectId;
  following: Types.ObjectId;
  createdAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Unique + Compound indexes
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

// ❌ Prevent self-follow
followSchema.pre("save", function (next) {
  if (this.follower.toString() === this.following.toString()) {
    return next(new Error("User cannot follow themselves"));
  }
  next();
});

// 📊 Auto increment + 🔔 Notification trigger
followSchema.post("save", async function (doc) {
  await Promise.all([
    User.findByIdAndUpdate(doc.follower, { $inc: { followingCount: 1 } }),
    User.findByIdAndUpdate(doc.following, { $inc: { followersCount: 1 } })
  ]);

  // 🔔 Send notification to the followed user
  try {
    const followerUser = await User.findById(doc.follower).select("username");
    if (followerUser) {
      await createNotification({
        userId: doc.following,
        type: "follow",
        message: `${followerUser.username} started following you`,
        relatedUser: doc.follower
      });
    }
  } catch (err) {
    console.error("Notification error on follow:", err);
  }
});

// 📉 Auto decrement
followSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  await Promise.all([
    User.findByIdAndUpdate(doc.follower, { $inc: { followingCount: -1 } }),
    User.findByIdAndUpdate(doc.following, { $inc: { followersCount: -1 } })
  ]);
});

// 🛡 Bulk delete safe with wrapper
followSchema.pre(
  "deleteMany",
  withTypedMiddleware(async function (this: any, next) {
    const filter = this.getFilter();
    const docs = await model<IFollow>("Follow").find(filter).select("follower following").lean();

    const affectedUserIds = new Set<string>();
    docs.forEach((d) => {
      affectedUserIds.add(d.follower.toString());
      affectedUserIds.add(d.following.toString());
    });

    this._affectedUserIds = Array.from(affectedUserIds);
    next();
  })
);

followSchema.post("deleteMany", async function () {
  const affectedUserIds: string[] = (this as any)._affectedUserIds || [];
  if (!affectedUserIds.length) return;

  await Promise.all(
    affectedUserIds.map(async (u) => {
      const followersCount = await model<IFollow>("Follow").countDocuments({ following: u });
      const followingCount = await model<IFollow>("Follow").countDocuments({ follower: u });
      await User.findByIdAndUpdate(u, { followersCount, followingCount });
    })
  );
});

export const Follow = model<IFollow>("Follow", followSchema);
