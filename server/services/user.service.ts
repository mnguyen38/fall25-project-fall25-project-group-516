import UserModel from '../models/users.model';
import {
  DatabaseUser,
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
  OAuthUserProfile,
  UserRolesResponse,
} from '../types/types';

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

    const safeUser: SafeDatabaseUser = {
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
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username }).select('-password');

    if (!user) {
      throw Error('User not found');
    }

    return user;
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
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password');

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
          status: 'online',
        },
      },
    );

    // Get updated user without password
    const updatedUser: SafeDatabaseUser | null = await UserModel.findOne({ username }).select(
      '-password',
    );

    if (!updatedUser) {
      throw Error('Failed to retrieve updated user');
    }

    return updatedUser;
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
    const deletedUser: SafeDatabaseUser | null = await UserModel.findOneAndDelete({
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
    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
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
    const user: SafeDatabaseUser | null = await UserModel.findOne({
      oauthProvider,
      oauthId,
    }).select('-password');

    if (user) {
      return user;
    }

    if (profile.email) {
      const existingUserByEmail: SafeDatabaseUser | null = await UserModel.findOne({
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

    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
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

    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
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
