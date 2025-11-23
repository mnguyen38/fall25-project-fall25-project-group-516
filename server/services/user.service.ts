import UserModel from '../models/users.model';
import {
  DatabaseUser,
  PopulatedSafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
  OAuthUserProfile,
  UserRolesResponse,
} from '../types/types';
import { populateUser } from '../utils/database.util';
import mongoose from 'mongoose';

/**
 * Saves a new user to the database.
 *
 * @param {User} user - The user object to be saved, containing user details like username, password, etc.
 * @returns {Promise<UserResponse>} - Resolves with the saved user object (without the password) or an error message.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    // Set initial login data for new users
    const now = new Date();
    const userWithLoginData = {
      ...user,
      lastLogin: now,
      loginStreak: 1,
      maxLoginStreak: 1,
    };

    const result: DatabaseUser = await UserModel.create(userWithLoginData);

    if (!result) {
      throw Error('Failed to create user');
    }

    const safeUser: PopulatedSafeDatabaseUser = {
      _id: result._id,
      username: result.username,
      dateJoined: result.dateJoined,
      biography: result.biography,
      lastLogin: result.lastLogin,
      loginStreak: result.loginStreak,
      maxLoginStreak: result.maxLoginStreak,
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when saving user: ${error}` };
  }
};

/**
 * Retrieves a user from the database by their username.
 *
 * @param {string} username - The username of the user to find.
 * @returns {Promise<UserResponse>} - Resolves with the found user object (without the password) or an error message.
 */
export const getUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const user = await UserModel.findOne({ username }).select('_id');

    if (!user) {
      throw Error('User not found');
    }

    const populatedUser: PopulatedSafeDatabaseUser = await populateUser(user._id.toString());

    return populatedUser;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Retrieves all users from the database.
 * Users documents are returned in the order in which they were created, oldest to newest.
 *
 * @returns {Promise<UsersResponse>} - Resolves with the found user objects (without the passwords) or an error message.
 */
export const getUsersList = async (): Promise<UsersResponse> => {
  try {
    const users: PopulatedSafeDatabaseUser[] = await UserModel.find().select('-password');

    if (!users) {
      throw Error('Users could not be retrieved');
    }

    return users;
  } catch (error) {
    return { error: `Error occurred when finding users: ${error}` };
  }
};

/**
 * Authenticates a user by verifying their username and password.
 * Also updates login streak tracking.
 *
 * @param {UserCredentials} loginCredentials - An object containing the username and password.
 * @returns {Promise<UserResponse>} - Resolves with the authenticated user object (without the password) or an error message.
 */
export const loginUser = async (loginCredentials: UserCredentials): Promise<UserResponse> => {
  const { username, password } = loginCredentials;

  try {
    const user = await UserModel.findOne({ username, password });

    if (!user) {
      throw Error('Authentication failed');
    }

    // Update login streak
    const now = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;

    let newLoginStreak = 1;
    let streakHold = false;
    let missedDays = 0;

    if (lastLogin) {
      const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day login - keep streak unchanged, but ensure minimum of 1
        newLoginStreak = Math.max(user.loginStreak || 1, 1);
      } else if (diffDays === 1) {
        // Consecutive day login - increment streak, ensuring minimum of 1
        newLoginStreak = Math.max(user.loginStreak || 0, 0) + 1;
      } else if (diffDays <= 7) {
        if (
          (user.streakPass && user.streakPass > 0) ||
          (user.coins && user.coins > diffDays * 10)
        ) {
          // will present option for user to use streak pass later
          // can also use 10*number of days missed to recover <- might want to remove during testing
          // keep streak unchanged, but ensure minimum of 1
          newLoginStreak = Math.max(user.loginStreak || 1, 1);
          streakHold = true;
          missedDays = diffDays;
        } else {
          // no streak passes or enough coins - reset to 1
          newLoginStreak = 1;
        }
      } else {
        // Streak broken
        newLoginStreak = 1;
      }
    } else {
      // First time login - set to 1
      newLoginStreak = 1;
    }

    // Update max streak if current streak is higher, ensuring minimum of 1
    const newMaxStreak = Math.max(newLoginStreak, user.maxLoginStreak || 0, 1);

    // Update user with new login data and set status to online
    await UserModel.updateOne(
      { username },
      {
        $set: {
          lastLogin: now,
          loginStreak: newLoginStreak,
          maxLoginStreak: newMaxStreak,
          streakHold: streakHold,
          missedDays: missedDays,
          status: 'online',
        },
      },
    );

    // Get updated user without password
    const updatedUser = await populateUser(user._id.toString());

    if (!updatedUser) {
      throw Error('Failed to retrieve updated user');
    }

    return updatedUser as PopulatedSafeDatabaseUser;
  } catch (error) {
    return { error: `Error occurred when authenticating user: ${error}` };
  }
};

/**
 * Deletes a user from the database by their username.
 *
 * @param {string} username - The username of the user to delete.
 * @returns {Promise<UserResponse>} - Resolves with the deleted user object (without the password) or an error message.
 */
export const deleteUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const deletedUser: PopulatedSafeDatabaseUser | null = await UserModel.findOneAndDelete({
      username,
    }).select('-password');

    if (!deletedUser) {
      throw Error('Error deleting user');
    }

    return deletedUser;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Updates user information in the database.
 *
 * @param {string} username - The username of the user to update.
 * @param {Partial<User>} updates - An object containing the fields to update and their new values.
 * @returns {Promise<UserResponse>} - Resolves with the updated user object (without the password) or an error message.
 */
export const updateUser = async (
  username: string,
  updates: Partial<User>,
): Promise<UserResponse> => {
  try {
    const updatedUser: PopulatedSafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true },
    ).select('-password');

    if (!updatedUser) {
      throw Error('Error updating user');
    }

    return updatedUser;
  } catch (error) {
    return { error: `Error occurred when updating user: ${error}` };
  }
};

/**
 * Finds a user by their OAuth provider/ID or email, or creates a new user if not found.
 * Links OAuth details to an existing email account if found.
 *
 * @param {string} oauthProvider - The name of the OAuth provider (e.g., 'github').
 * @param {string} oauthId - The unique ID provided by the OAuth provider.
 * @param {OAuthUserProfile} profile - Profile information from the OAuth provider.
 * @returns {Promise<UserResponse>} - Resolves with the found or created user object (without password) or an error message.
 */
export const findOrCreateOAuthUser = async (
  oauthProvider: 'google' | 'github',
  oauthId: string,
  profile: OAuthUserProfile,
): Promise<UserResponse> => {
  try {
    const user: PopulatedSafeDatabaseUser | null = await UserModel.findOne({
      oauthProvider,
      oauthId,
    }).select('-password');

    if (user) {
      return user;
    }

    if (profile.email) {
      const existingUserByEmail: PopulatedSafeDatabaseUser | null = await UserModel.findOne({
        email: profile.email,
      }).select('-password');

      if (existingUserByEmail) {
        existingUserByEmail.oauthProvider = oauthProvider;
        existingUserByEmail.oauthId = oauthId;

        const updatedUserResult = await updateUser(existingUserByEmail.username, {
          oauthProvider: oauthProvider,
          oauthId: oauthId,
        });

        if ('error' in updatedUserResult) {
          throw new Error(
            `Failed to link OAuth to existing email account: ${updatedUserResult.error}`,
          );
        }
        return updatedUserResult;
      }
    }

    let usernameToSave = profile.username || `${oauthProvider}_${profile.id}`; // Default username idea
    const existingUsername = await UserModel.findOne({ username: usernameToSave });

    if (existingUsername) {
      usernameToSave = `${usernameToSave}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const newUserResult = await saveUser({
      username: usernameToSave,
      email: profile.email,
      dateJoined: new Date(),
      oauthProvider,
      oauthId,
      biography: profile.bio || '',
      profilePicture: profile.avatar_url || '',
    });

    if ('error' in newUserResult) {
      throw new Error(`Failed to save new OAuth user: ${newUserResult.error}`);
    }

    return newUserResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Error during OAuth user processing: ${message}` };
  }
};

/**
 *
 */
export const getUserRolesById = async (id: string): Promise<UserRolesResponse> => {
  try {
    const roles = await UserModel.findById(id).select('roles');
    if (!roles) {
      throw new Error('User not found');
    }
    return roles;
  } catch (error) {
    return { error: `Error occured while the user's roles: ${error}` };
  }
};

/** Adds or removes coins from specified account.
 * @param username User to whom coins will be allocated/ redacted
 * @param cost amount of coins
 * @param type whether the transaction is + or -
 * @returns updated user with new coin amount
 */
export const makeTransaction = async (
  username: string,
  cost: number,
  type: 'add' | 'reduce',
): Promise<UserResponse> => {
  try {
    const user: DatabaseUser | null = await UserModel.findOne({ username: username });

    if (!user) {
      return { error: 'Error finding user to make transaction' };
    }

    let newCoinValue = 0;
    if (user.coins) {
      if (type == 'add') {
        newCoinValue = cost + user.coins;
      } else {
        newCoinValue = user.coins - cost;
        if (newCoinValue < 0) {
          return { error: 'Not enough coins to make transaction' };
        }
      }
    } else {
      if (type == 'add') {
        newCoinValue = cost;
      } else {
        newCoinValue = 0;
        return { error: 'Not enough coins to make transaction' };
      }
    }

    const updatedUser: PopulatedSafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      {
        $set: {
          coins: newCoinValue,
        },
      },
      { new: true },
    ).select('-password');

    if (!updatedUser) {
      return { error: 'Error updating user coins' };
    }

    return updatedUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
};

export const readNotifications = async (
  username: string,
  notificationIds: string[],
): Promise<UserResponse> => {
  try {
    const objectIds = notificationIds.map(id => new mongoose.Types.ObjectId(id));

    const updateResult = await UserModel.updateOne(
      { username },
      {
        $set: {
          'notifications.$[elem].read': true,
        },
      },
      {
        arrayFilters: [{ 'elem.notification': { $in: objectIds } }],
      },
    );

    if (updateResult.matchedCount === 0) {
      throw new Error('User not found');
    }

    const user = await UserModel.findOne({ username });

    if (!user) {
      throw new Error('User found during update but failed to fetch');
    }

    const safeUser = await populateUser(user._id.toString());

    return safeUser;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Updates a user's status and custom status message.
 *
 * @param {string} username - The username of the user to update.
 * @param {string} status - The new status ('online', 'busy', 'away').
 * @param {string} customStatus - Optional custom status message.
 * @returns {Promise<UserResponse>} - Resolves with the updated user object or an error message.
 */
export const updateUserStatus = async (
  username: string,
  status: 'online' | 'busy' | 'away',
  customStatus?: string,
): Promise<UserResponse> => {
  try {
    const updates: Partial<User> = { status };
    if (customStatus !== undefined) {
      updates.customStatus = customStatus;
    }

    const updatedUser: PopulatedSafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true },
    ).select('-password');

    if (!updatedUser) {
      throw Error('Error updating user status');
    }

    return updatedUser;
  } catch (error) {
    return { error: `Error occurred when updating user status: ${error}` };
  }
};

/**
 * If user is a top contributor returns user. Else returns null.
 * @param {string} username - The username of the user to update.
 * @returns {Promise<UserResponse>} - Resolves with the user object or an error message.
 */
export const getUserIfTopContributor = async (username: string): Promise<UserResponse | null> => {
  try {
    interface AverageResult {
      _id: null;
      averageValue: number;
    }
    const pipeline = [{ $group: { _id: null, averageValue: { $avg: '$lifetimeUpvotes' } } }];

    const avgResult = await UserModel.aggregate<AverageResult>(pipeline).exec();

    if (!avgResult) {
      throw Error('Error finding average lifetimeUpvote score');
    }

    // average lifetimeUpvote value
    let average;
    // Access the result
    if (avgResult.length > 0) {
      average = avgResult[0].averageValue;
    } else {
      throw Error('Could not find average lifetimeUpvote score');
    }

    const user: PopulatedSafeDatabaseUser | null = (await UserModel.find({
      username: username,
      lifetimeUpvotes: { $gt: { average } },
    })) as unknown as PopulatedSafeDatabaseUser | null;

    if (!user) {
      return null;
    }

    if ('error' in user) {
      throw Error('Failed to find user');
    }

    return user;
  } catch (error) {
    return {
      error: `Error occurred when finding users with above average lifetime upvotes: ${error}`,
    };
  }
};
