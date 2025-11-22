import jwt from 'jsonwebtoken';
import { SafeDatabaseUser } from '../types/types';

// Use environment variable or default secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

/**
 * Generates a JWT token for a user
 * @param user The user object to generate token for
 * @returns The JWT token string
 */
export const generateToken = (user: SafeDatabaseUser): string => {
  const payload = {
    _id: user._id,
    username: user.username,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies a JWT token and returns the decoded payload
 * @param token The JWT token to verify
 * @returns The decoded token payload or null if invalid
 */
export const verifyToken = (token: string): { _id: string; username: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string; username: string };
    return decoded;
  } catch (error) {
    return null;
  }
};
