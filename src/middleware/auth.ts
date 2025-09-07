import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface JwtPayload { id: string }

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    // ✅ role include, passwordHash exclude
    const user = await User.findById(decoded.id).select('-passwordHash role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user; // Mongoose document assign
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
