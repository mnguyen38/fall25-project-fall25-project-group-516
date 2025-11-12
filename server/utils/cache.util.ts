import { RedisClientType } from '@redis/client';
import { createClient } from 'redis';

type Cache = RedisClientType | null;

let cacheClient: Cache = null;

/**
 * Initializes the Redis Cache.
 * @returns {Promise<RedisClientType>} - The Redis Client that is used to interact with the cache.
 */
const initializeCache = async (): Promise<RedisClientType> => {
  if (cacheClient?.isOpen) {
    return cacheClient;
  }

  try {
    cacheClient = createClient({
      username: 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST || 'redis-11500.c44.us-east-1-2.ec2.cloud.redislabs.com',
        port: 11500,
        tls: true,
        reconnectStrategy: retries => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Max retries exceeded');
          }
          return Math.min(retries * 50, 2000);
        },
      },
    });

    cacheClient.on('error', err => {
      console.error('Redis Client Error:', err);
    });

    await cacheClient.connect();

    return cacheClient;
  } catch (error) {
    console.error('Redis: Failed to initialize:', error);
    throw error;
  }
};

/**
 * Gets the Redis client instance.
 * Initializes if not already connected.
 * @returns {Promise<RedisClientType>}
 */
export const getCache = async (): Promise<RedisClientType> => {
  if (!cacheClient?.isOpen) {
    return await initializeCache();
  }
  return cacheClient;
};

/**
 * Gracefully closes the Redis connection.
 */
export const closeCache = async (): Promise<void> => {
  if (cacheClient?.isOpen) {
    try {
      await cacheClient.quit();
    } catch (error) {
      console.error('Redis: Error during disconnect:', error);
      cacheClient.destroy();
    }
  }
};
