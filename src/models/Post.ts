import { Schema, model, Document, Types, Model } from "mongoose";
import { User } from "./User";

// 📄 Document interface
export interface IPost extends Document {
  title: string;
  description: string;
  content: any[];
  category: string;
  tags: string[];
  images: string[];
  authorId: Types.ObjectId;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  isGoldenVerified: boolean;
  stats: {
    views: number;
    likes: number;
  };
  status: "active" | "restricted" | "blocked" | "deleted";
  restrictionReason?: string | null;
  copyrightScanStatus: "pending" | "passed" | "failed" | "disputed";
  createdAt: Date;
  updatedAt: Date;
}

// 🏗 Model statics interface
export interface IPostModel extends Model<IPost> {
  incrementView(
    postId: Types.ObjectId | string,
    viewerId?: Types.ObjectId | string,
    viewerIp?: string
  ): Promise<IPost | null>;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    content: { type: Schema.Types.Mixed, required: true },

    category: { type: String, default: "General", index: true },
    tags: [{ type: String, index: true }],
    images: [{ type: String }],

    // ✅ Author Info
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    authorUsername: { type: String, required: true, trim: true, lowercase: true, index: true },
    authorAvatar: { type: String },
    isGoldenVerified: { type: Boolean, default: false, index: true },

    // ✅ Stats
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },

    // ✅ Moderation + Scan Fields
    status: {
      type: String,
      enum: ["active", "restricted", "blocked", "deleted"],
      default: "active",
      index: true,
    },
    restrictionReason: { type: String, default: null },
    copyrightScanStatus: {
      type: String,
      enum: ["pending", "passed", "failed", "disputed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

//
// 📊 Auto-increment/decrement User.postsCount
//
postSchema.post("save", async function (doc) {
  try {
    await User.findByIdAndUpdate(doc.authorId, { $inc: { postsCount: 1 } });
  } catch (err) {
    console.error("Error incrementing postsCount:", err);
  }
});

postSchema.post("findOneAndDelete", async function (doc: IPost | null) {
  if (!doc) return;
  try {
    await User.findByIdAndUpdate(doc.authorId, { $inc: { postsCount: -1 } });
  } catch (err) {
    console.error("Error decrementing postsCount:", err);
  }
});

//
// 🏷 Keyword → Category mapping
//
const CATEGORY_MAP: Record<string, string> = {
  sports: "Sports", cricket: "Sports", football: "Sports", soccer: "Sports",
  basketball: "Sports", tennis: "Sports", badminton: "Sports", hockey: "Sports",
  olympics: "Sports", wrestling: "Sports", boxing: "Sports", kabaddi: "Sports",
  baseball: "Sports", golf: "Sports", racing: "Sports", f1: "Sports", athletics: "Sports",

  tech: "Technology", technology: "Technology", javascript: "Technology", js: "Technology",
  typescript: "Technology", python: "Technology", java: "Technology", cpp: "Technology",
  ai: "Technology", artificialintelligence: "Technology", machinelearning: "Technology",
  ml: "Technology", deeplearning: "Technology", blockchain: "Technology", crypto: "Technology",
  cybersecurity: "Technology", programming: "Technology", coding: "Technology",
  gadgets: "Technology", smartphone: "Technology", iphone: "Technology", android: "Technology",
  webdev: "Technology", cloud: "Technology", devops: "Technology",

  politics: "News", election: "News", government: "News", world: "News",
  international: "News", india: "News", usa: "News", uk: "News", china: "News",
  economy: "News", finance: "News", business: "News", startup: "News",
  war: "News", breaking: "News",

  music: "Entertainment", song: "Entertainment", album: "Entertainment",
  movie: "Entertainment", film: "Entertainment", cinema: "Entertainment",
  bollywood: "Entertainment", hollywood: "Entertainment", tollywood: "Entertainment",
  kollywood: "Entertainment", tv: "Entertainment", series: "Entertainment",
  netflix: "Entertainment", primevideo: "Entertainment", hotstar: "Entertainment",
  disney: "Entertainment", gaming: "Entertainment", games: "Entertainment",
  anime: "Entertainment", cartoon: "Entertainment", meme: "Entertainment",

  health: "Lifestyle", fitness: "Lifestyle", yoga: "Lifestyle", travel: "Lifestyle",
  food: "Lifestyle", cooking: "Lifestyle", fashion: "Lifestyle",
  education: "Education", study: "Education", exam: "Education",
  science: "Science", space: "Science", astronomy: "Science",
  environment: "Science", climate: "Science",
};

//
// 🔄 Auto-category assignment with scoring
//
postSchema.pre("save", function (next) {
  if (!this.category || this.category === "General") {
    const text = (this.title + " " + (this.tags || []).join(" ")).toLowerCase();
    const words = text.split(/\W+/).filter(Boolean);

    const scores: Record<string, number> = {};

    for (const keyword in CATEGORY_MAP) {
      if (words.includes(keyword.toLowerCase())) {
        const cat = CATEGORY_MAP[keyword];
        scores[cat] = (scores[cat] || 0) + 1;
      }
    }

    if (Object.keys(scores).length > 0) {
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      this.category = sorted[0][0];
    } else {
      this.category = "General";
    }
  }
  next();
});

//
// 👁 Screen View Increment Logic
//
postSchema.statics.incrementView = async function (
  postId: Types.ObjectId | string,
  viewerId?: Types.ObjectId | string,
  viewerIp?: string
) {
  return this.findByIdAndUpdate(
    postId,
    { $inc: { "stats.views": 1 } },
    { new: true }
  ).select("stats.views");
};

export const Post = model<IPost, IPostModel>("Post", postSchema);
