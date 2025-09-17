import { Schema, model, Document, Types, Model } from "mongoose";

// 📄 Document interface
export interface IPostMeta extends Document {
  title: string;
  description: string;
  category: string;
  tags: string[];
  files: {
    url: string;
    type: string;
    name?: string;
    size?: number;
  }[];
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
export interface IPostMetaModel extends Model<IPostMeta> {
  incrementView(postMetaId: Types.ObjectId | string, viewerId?: Types.ObjectId | string, viewerIp?: string): Promise<IPostMeta | null>;
}

const postMetaSchema = new Schema<IPostMeta>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    category: { type: String, default: "General", index: true },
    tags: [{ type: String, index: true }],

    files: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true },
        name: { type: String },
        size: { type: Number },
      },
    ],

    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    authorUsername: { type: String, required: true, trim: true, lowercase: true, index: true },
    authorAvatar: { type: String },
    isGoldenVerified: { type: Boolean, default: false, index: true },

    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["active", "restricted", "blocked", "deleted"],
      default: "active",
      index: true
    },
    restrictionReason: { type: String, default: null },
    copyrightScanStatus: {
      type: String,
      enum: ["pending", "passed", "failed", "disputed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

// 🏷 Keyword → Category mapping
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

// 🔄 Auto‑category assignment from title + tags
postMetaSchema.pre("save", function (next) {
  if (!this.category || this.category === "General") {
    const combinedText = (this.title + " " + (this.tags || []).join(" "))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // remove spaces & special chars

    let matchedCategory = "General";

    for (const keyword in CATEGORY_MAP) {
      if (combinedText.includes(keyword.toLowerCase())) {
        matchedCategory = CATEGORY_MAP[keyword];
        break;
      }
    }

    this.category = matchedCategory;
  }
  next();
});

// 👁 Static method for view increment
postMetaSchema.statics.incrementView = async function (
  postMetaId: Types.ObjectId | string,
  viewerId?: Types.ObjectId | string,
  viewerIp?: string
) {
  return this.findByIdAndUpdate(
    postMetaId,
    { $inc: { "stats.views": 1 } },
    { new: true }
  ).select("stats.views");
};

export const PostMeta = model<IPostMeta, IPostMetaModel>("PostMeta", postMetaSchema);
