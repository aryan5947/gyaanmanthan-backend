// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";

/**
 * JwtPayload — extends default JWT payload to include our user id
 */
export interface JwtPayload extends DefaultJwtPayload {
  id: string;
}

/**
 * Global augmentation for Express Request
 * Ensures req.user is strongly typed across the app
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      _id: any;
      id: string;
      name: string;
      username: string;
      email: string;
      avatarUrl?: string;
      bannerUrl?: string; // ✅ added banner
      plan: string;
      walletBalance: number;
      role: "user" | "admin" | "moderator" | "banned";
    };
  }
}

/**
 * auth — JWT authentication middleware
 * - Verifies token
 * - Loads user from DB
 * - Attaches safe user object to req.user
 */
export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const user = await User.findById(decoded.id)
      .select("name username email avatarUrl bannerUrl plan walletBalance role") // ✅ only safe fields
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid token: User not found" });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl, // ✅ now included in req.user
      plan: user.plan,
      walletBalance: user.walletBalance,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error during authentication" });
  }
}
