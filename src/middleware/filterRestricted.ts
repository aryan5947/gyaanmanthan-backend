import { Request, Response, NextFunction } from 'express';
import { Post } from '../models/Post';
import { PostMeta } from '../models/PostMeta';

/**
 * Middleware to block restricted/blocked content from being served in API responses.
 * 
 * Usage:
 *   router.get('/posts/:id', filterRestricted('post'), getPostHandler);
 *   router.get('/post-meta/:id', filterRestricted('postMeta'), getPostMetaHandler);
 */
export function filterRestricted(type: 'post' | 'postMeta') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      let doc;

      if (type === 'postMeta') {
        doc = await PostMeta.findById(id).lean();
      } else {
        doc = await Post.findById(id).lean();
      }

      if (!doc) {
        return res.status(404).json({ error: 'Content not found' });
      }

      if (doc.status === 'restricted' || doc.status === 'blocked') {
        return res.status(403).json({
          error: 'This content is not available due to policy restrictions.'
        });
      }

      // Attach doc to request for downstream handlers
      (req as any).contentDoc = doc;
      next();
    } catch (err) {
      console.error('Error in filterRestricted middleware:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
