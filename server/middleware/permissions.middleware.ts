import { Request, Response, NextFunction } from 'express';
import { getCachedUserRoles } from '../utils/cache.util';

const permissions = (permittedRoles: string[], communityGen: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add null check for req.user
      if (!req.user) {
        res.status(401).json({ error: 'User not authorized' });
        return;
      }

      const communityId = communityGen(req);
      const cachedRoles = await getCachedUserRoles(req.user._id);
      const role = cachedRoles.get(communityId);

      if (!role) {
        res.status(401).json({ error: 'User not authorized' });
        return;
      }

      const hasPermission = permittedRoles.includes(role);
      if (!hasPermission) {
        res.status(401).json({ error: 'User not authorized' });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export default permissions;
