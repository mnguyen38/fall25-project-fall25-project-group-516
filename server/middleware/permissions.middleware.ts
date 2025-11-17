import { Request, Response, NextFunction } from 'express';
import { getCachedUserRoles } from '../utils/cache.util';

export const permissions = (permittedRoles: string[], communityGen: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const communityId = communityGen(req);
      const cachedRoles = await getCachedUserRoles(req.user._id);

      const role = cachedRoles.get(communityId);

      if (!role) {
        res.status(401).json({ error: 'User not authorized' });
        return;
      }

      const hasPermission = permittedRoles.includes(role);

      if (!hasPermission) {
        console.log('rejected');
        res.status(401).json({ error: 'User not authorized' });
        return;
      }

      next();
    } catch (err) {
      console.error('Cache GET error:', err);
      next();
    }
  };
};
