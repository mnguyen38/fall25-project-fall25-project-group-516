import { RedisClientType } from '@redis/client';
import { createClient } from 'redis';
import { PopulatedSafeDatabaseUser, UserResponse } from '@fake-stack-overflow/shared';
import { getUserRolesById } from '../services/user.service';
import { populateUser } from './database.util';
import UserModel from '../models/users.model';

type Cache = RedisClientType | null;

const DEFAULT_ROLE_EXPIRATION = 3600;

let cacheClient: Cache = null;

/**
 * Initializes the Redis Cache.
 * @returns {Promise<RedisClientType>} - The Redis Client that is used to interact with the cache.
 */
const initializeCache = async (): Promise<RedisClientType> => {
  if (cacheClient?.isOpen) {
    return cacheClient;
  }

  cacheClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST || 'redis-11500.c44.us-east-1-2.ec2.cloud.redislabs.com',
      port: 11500,
      tls: false,
      reconnectStrategy: retries => {
        if (retries > 10) {
          return new Error('Max retries exceeded');
        }
        return Math.min(retries * 50, 2000);
      },
    },
  });

  cacheClient.on('error', err => {
    return new Error(`Redis Client Error: ${err}`);
  });

  await cacheClient.connect();

  return cacheClient;
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
      cacheClient.destroy();
    }
  }
};

export const getCachedUserRoles = async (userId: string): Promise<Map<string, string>> => {
  try {
    const cache = await getCache();

    const cachedUserRoles = await cache.get(`roles:${userId}`);

    if (cachedUserRoles !== null) {
      const parsedRoles = JSON.parse(cachedUserRoles);
      const roleMap: Map<string, string> = new Map(Object.entries(parsedRoles));
      return roleMap;
    }

    const result = await getUserRolesById(userId);

    if ('error' in result) {
      throw new Error(result.error);
    }

    if (result.roles === undefined || result.roles === null) {
      throw new Error(`Roles not found`);
    }

    await cache.setEx(`roles:${userId}`, DEFAULT_ROLE_EXPIRATION, JSON.stringify(result.roles));

    return result.roles;
  } catch (error) {
    // Fallback to direct database query if cache fails
    const result = await getUserRolesById(userId);

    if ('error' in result) {
      throw new Error(result.error);
    }

    if (result.roles === undefined || result.roles === null) {
      throw new Error(`Roles not found`);
    }

    return result.roles;
  }
};

export const getCachedUser = async (userId: string): Promise<UserResponse> => {
  try {
    const cache = await getCache();

    const cachedUser = await cache.get(`user:${userId}`);

    if (cachedUser !== null) {
      const parsedUser: PopulatedSafeDatabaseUser = JSON.parse(cachedUser);
      return parsedUser;
    }

    const user = await populateUser(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    // Fallback to direct database query if cache fails
    const user = await UserModel.findById(userId).select('-password');

    if (!user) {
      return { error: 'User not found' };
    }

    return user.toObject() as PopulatedSafeDatabaseUser;
  }
};
