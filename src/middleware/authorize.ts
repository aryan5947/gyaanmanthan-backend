import { Request, Response, NextFunction } from 'express';
import { PostMeta } from '../models/PostMeta';

/**
 * Role-based access control middleware with optional ownership check
 * Usage:
 *   authorize(['admin', 'moderator']) // role check only
 *   authorize(['admin', 'moderator', 'user'], true) // role + ownership check
 */
export function authorize(allowedRoles: string[], checkOwnership = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Role check
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Ownership check (only if enabled and user is not admin/moderator)
      if (checkOwnership && !['admin', 'moderator'].includes(req.user.role)) {
        const postMeta = await PostMeta.findById(req.params.id);
        if (!postMeta) {
          return res.status(404).json({ message: 'PostMeta not found' });
        }
        if (postMeta.authorId.toString() !== req.user.id) {
          return res.status(403).json({ message: 'You do not own this PostMeta' });
        }
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  };
}
