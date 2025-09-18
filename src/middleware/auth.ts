import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";

export interface JwtPayload extends DefaultJwtPayload {
  id: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      _id: any;
      id: string;
      name: string;
      username: string;
      email: string;
      avatarUrl?: string;
      bannerUrl?: string;
      plan: string;
      walletBalance: number;
      role: "user" | "admin" | "moderator" | "banned";
    };
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("🔹 [AUTH] Incoming request:", req.method, req.originalUrl);
    console.log("🔹 [AUTH] Authorization header:", req.headers.authorization);

    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      console.warn("❌ [AUTH] No token provided");
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
      console.log("✅ [AUTH] Decoded JWT payload:", decoded);
    } catch (err: any) {
      console.error("❌ [AUTH] JWT verification failed:", err.name, err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const user = await User.findById(decoded.id)
      .select("name username email avatarUrl bannerUrl plan walletBalance role")
      .lean();

    if (!user) {
      console.warn("❌ [AUTH] User not found for ID:", decoded.id);
      return res.status(401).json({ message: "Invalid token: User not found" });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      plan: user.plan,
      walletBalance: user.walletBalance,
      role: user.role,
    };

    console.log("✅ [AUTH] Authenticated user:", req.user.username, req.user.id);
    next();
  } catch (err) {
    console.error("❌ [AUTH] Middleware error:", err);
    return res.status(500).json({ message: "Server error during authentication" });
  }
}
