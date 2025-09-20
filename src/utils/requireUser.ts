// src/utils/requireUser.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure req.user is defined after auth
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
