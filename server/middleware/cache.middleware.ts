import { Request, Response, NextFunction } from 'express';
import { getCache } from '../utils/cache.util';

export function cache(expiry: number, keyGen: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGen(req);

    try {
      const cache = await getCache();

      const cachedData = await cache.get(key);

      if (cachedData) {
        console.log(`CACHE HIT: ${key}`);
        return res.type('application/json').send(cachedData);
      }

      const originalSend = res.send.bind(res);

      res.send = (body): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          (async () => {
            try {
              await cache.set(key, body, {
                EX: expiry,
              });
            } catch (err) {
              console.error('Redis SET error:', err);
            }
          })();
        }

        return originalSend(body);
      };

      next();
    } catch (err) {
      console.error('Cache GET error:', err);
      next();
    }
  };
}

export const invalidate = (keyGen: (req: Request) => string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);

    res.send = (body): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        (async () => {
          try {
            const cache = await getCache();
            const keysToDelete = keyGen(req);
            const keys = Array.isArray(keysToDelete) ? keysToDelete : [keysToDelete];

            if (keys.length > 0) {
              await cache.del(keys);
            }
          } catch (err) {
            console.error('Cache invalidation error:', err);
          }
        })();
      }

      return originalSend(body);
    };

    next();
  };
};
