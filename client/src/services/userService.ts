import axios from 'axios';
import { UserCredentials, PopulatedSafeDatabaseUser } from '../types/types';
import api from './config';
import { setAuthToken, getAuthToken, removeAuthToken } from '../utils/auth';

const USER_API_URL = `/api/user`;

interface AuthResponse {
  user: PopulatedSafeDatabaseUser;
  token: string;
}

// Re-export auth functions for convenience
export { setAuthToken, getAuthToken, removeAuthToken };

/**
 * Function to get users
 *
 * @throws Error if there is an issue fetching users.
 */
const getUsers = async (): Promise<PopulatedSafeDatabaseUser[]> => {
  const res = await api.get(`${USER_API_URL}/getUsers`);
  if (res.status !== 200) {
    throw new Error('Error when fetching users');
  }
  return res.data;
};

/**
 * Function to get users
 *
 * @throws Error if there is an issue fetching users.
 */
const getUserByUsername = async (username: string): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.get(`${USER_API_URL}/getUser/${username}`);
  if (res.status !== 200) {
    throw new Error('Error when fetching user');
  }
  return res.data;
};

/**
 * Sends a POST request to create a new user account.
 *
 * @param user - The user credentials (username and password) for signup.
 * @returns {Promise<User>} The newly created user object.
 * @throws {Error} If an error occurs during the signup process.
 */
const createUser = async (user: UserCredentials): Promise<PopulatedSafeDatabaseUser> => {
  try {
    const res = await api.post<AuthResponse>(`${USER_API_URL}/signup`, user);
    // Store the token in localStorage
    setAuthToken(res.data.token);
    return res.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Error while signing up: ${error.response.data}`);
    } else {
      throw new Error('Error while signing up');
    }
  }
};

/**
 * Sends a POST request to authenticate a user.
 *
 * @param user - The user credentials (username and password) for login.
 * @returns {Promise<User>} The authenticated user object.
 * @throws {Error} If an error occurs during the login process.
 */
const loginUser = async (user: UserCredentials): Promise<PopulatedSafeDatabaseUser> => {
  try {
    const res = await api.post<AuthResponse>(`${USER_API_URL}/login`, user);

    // Store the token in localStorage
    setAuthToken(res.data.token);

    return res.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Error while logging in: ${error.response.data}`);
    } else {
      throw new Error('Error while logging in');
    }
  }
};

/**
 * Verifies the stored JWT token and returns the user data if valid.
 * @returns The user object if token is valid, null otherwise
 * @throws Error if verification fails
 */
const verifyStoredToken = async (): Promise<PopulatedSafeDatabaseUser | null> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    const res = await api.get<{ user: PopulatedSafeDatabaseUser }>(`${USER_API_URL}/verify-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 200) {
      return res.data.user;
    }
    return null;
  } catch (error) {
    // Token is invalid or expired, remove it
    removeAuthToken();
    return null;
  }
};

/**
 * Deletes a user by their username.
 * @param username - The unique username of the user
 * @returns A promise that resolves to the deleted user data
 * @throws {Error} If the request to the server is unsuccessful
 */
const deleteUser = async (username: string): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.delete(`${USER_API_URL}/deleteUser/${username}`);
  if (res.status !== 200) {
    throw new Error('Error when deleting user');
  }
  return res.data;
};

/**
 * Add coins to a user's account.
 * @param username - The unique username of the user
 * @param cost - The amount of coins to add to their account
 * @param description - Optional description for transaction
 * @returns A promise that resolves to the updated user data
 * @throws {Error} if the request to the server is unsuccessful
 */
const addCoins = async (
  username: string,
  cost: number,
  description?: string,
): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/addCoins`, {
    username,
    cost,
    description,
  });
  if (res.status !== 200) {
    throw new Error('Error when adding coins');
  }
  return res.data;
};

/**
 * Reduce coins from a user's account.
 * @param username - The unique username of the user
 * @param cost - The amount of coins to reduce from their account
 * @param description - Optional description for transaction
 * @returns A promise that resolves to the updated user data
 * @throws {Error} if the request to the server is unsuccessful
 */
const reduceCoins = async (
  username: string,
  cost: number,
  description?: string,
): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/reduceCoins`, {
    username,
    cost,
    description,
  });
  if (res.status !== 200) {
    throw new Error('Error when reducing coins');
  }
  return res.data;
};

/**
 * Resets the password for a user.
 * @param username - The unique username of the user
 * @param newPassword - The new password to be set for the user
 * @returns A promise that resolves to the updated user data
 * @throws {Error} If the request to the server is unsuccessful
 */
const resetPassword = async (
  username: string,
  newPassword: string,
): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/resetPassword`, {
    username,
    password: newPassword,
  });
  if (res.status !== 200) {
    throw new Error('Error when resetting password');
  }
  return res.data;
};

/**
 * Updates the user's biography.
 * @param username The unique username of the user
 * @param newBiography The new biography to set for this user
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const updateBiography = async (
  username: string,
  newBiography: string,
): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/updateBiography`, {
    username,
    biography: newBiography,
  });
  if (res.status !== 200) {
    throw new Error('Error when updating biography');
  }
  return res.data;
};

/**
 * Updates the user's login streak visibility.
 * @param username The unique username of the user
 * @param newBiography The new login streak visibility to set for this user
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const updateShowLoginStreak = async (
  username: string,
  showLoginStreak: boolean,
): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/updateShowLoginStreak`, {
    username,
    showLoginStreak,
  });
  if (res.status !== 200) {
    throw new Error('Error when updating login streak visibility');
  }
  return res.data;
};

/**
 * Uploads a profile picture for a user.
 * @param username The unique username of the user
 * @param file The image file to upload
 * @param cropData Optional crop data {x, y, width, height}
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const uploadProfilePicture = async (
  username: string,
  file: File,
  cropData?: { x: number; y: number; width: number; height: number },
): Promise<PopulatedSafeDatabaseUser> => {
  const formData = new FormData();
  formData.append('profilePicture', file);
  formData.append('username', username);
  if (cropData) {
    formData.append('cropData', JSON.stringify(cropData));
  }

  const res = await api.post(`${USER_API_URL}/uploadProfilePicture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  if (res.status !== 200) {
    throw new Error('Error when uploading profile picture');
  }
  return res.data;
};

/**
 * Uploads a banner image for a user.
 * @param username The unique username of the user
 * @param file The image file to upload
 * @param cropData Optional crop data {x, y, width, height}
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const uploadBannerImage = async (
  username: string,
  file: File,
  cropData?: { x: number; y: number; width: number; height: number },
): Promise<PopulatedSafeDatabaseUser> => {
  const formData = new FormData();
  formData.append('bannerImage', file);
  formData.append('username', username);
  if (cropData) {
    formData.append('cropData', JSON.stringify(cropData));
  }

  const res = await api.post(`${USER_API_URL}/uploadBannerImage`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  if (res.status !== 200) {
    throw new Error('Error when uploading banner image');
  }
  return res.data;
};

/**
 * Toggles the user's profile privacy setting.
 * @param username The unique username of the user
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const toggleProfilePrivacy = async (username: string): Promise<PopulatedSafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/toggleProfilePrivacy`, {
    username,
  });
  if (res.status !== 200) {
    throw new Error('Error when toggling profile privacy');
  }
  return res.data;
};

export {
  getUsers,
  getUserByUsername,
  loginUser,
  createUser,
  deleteUser,
  resetPassword,
  updateBiography,
  updateShowLoginStreak,
  uploadProfilePicture,
  uploadBannerImage,
  verifyStoredToken,
  addCoins,
  reduceCoins,
  toggleProfilePrivacy,
};
