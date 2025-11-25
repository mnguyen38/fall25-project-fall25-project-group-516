import express, { Request, Response, Router } from 'express';
import {
  UserRequest,
  User,
  UserCredentials,
  UserByUsernameRequest,
  FakeSOSocket,
  UpdateBiographyRequest,
  TransactionRequest,
  UpdateShowLoginStreakRequest,
  ReadNotificationRequest,
  UpdateStatusRequest,
} from '../types/types';
import {
  blockUser,
  deleteUserByUsername,
  getUserByUsername,
  getUsersList,
  loginUser,
  makeTransaction,
  readNotifications,
  saveUser,
  unblockUser,
  updateUser,
  updateUserStatus,
} from '../services/user.service';
import { upload, processProfilePicture, processBannerImage } from '../utils/upload';
import { generateToken } from '../utils/jwt.util';
import protect from '../middleware/token.middleware';
import { checkAndAwardBadges } from '../services/badge.service';
import { populateUser } from '../utils/database.util';

const userController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  /**
   * Handles the creation of a new user account.
   * @param req The request containing username, email, and password in the body.
   * @param res The response, either returning the created user or an error.
   * @returns A promise resolving to void.
   */
  const createUser = async (req: UserRequest, res: Response): Promise<void> => {
    const requestUser = req.body;

    const user: User = {
      ...requestUser,
      dateJoined: new Date(),
      biography: requestUser.biography ?? '',
    };

    try {
      const result = await saveUser(user);

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Check and award badges for the new user (e.g., First Steps badge)
      await checkAndAwardBadges(result.username);

      // Generate JWT token for the new user
      const token = generateToken(result);

      socket.emit('userUpdate', {
        user: result,
        type: 'created',
      });
      res.status(200).json({ user: result, token });
    } catch (error) {
      res.status(500).send(`Error when saving user: ${error}`);
    }
  };

  /**
   * Handles user login by validating credentials.
   * @param req The request containing username and password in the body.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const userLogin = async (req: UserRequest, res: Response): Promise<void> => {
    try {
      const loginCredentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password,
      };

      const user = await loginUser(loginCredentials);

      if ('error' in user) {
        throw Error(user.error);
      }

      // Check and award badges based on login streak
      await checkAndAwardBadges(user.username);

      // Generate JWT token for the logged-in user
      const token = generateToken(user);

      res.status(200).json({ user, token });
    } catch (error) {
      res.status(500).send('Login failed');
    }
  };

  /**
   * Retrieves a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const getUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    try {
      const { username } = req.params;

      const user = await getUserByUsername(username);

      if ('error' in user) {
        throw Error(user.error);
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).send(`Error when getting user by username: ${error}`);
    }
  };

  /**
   * Retrieves all users from the database.
   * @param res The response, either returning the users or an error.
   * @returns A promise resolving to void.
   */
  const getUsers = async (_: Request, res: Response): Promise<void> => {
    try {
      const users = await getUsersList();

      if ('error' in users) {
        throw Error(users.error);
      }

      res.status(200).json(users);
    } catch (error) {
      res.status(500).send(`Error when getting users: ${error}`);
    }
  };

  /**
   * Deletes a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either confirming deletion or returning an error.
   * @returns A promise resolving to void.
   */
  const deleteUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    try {
      const { username } = req.params;

      const deletedUser = await deleteUserByUsername(username);

      if ('error' in deletedUser) {
        throw Error(deletedUser.error);
      }

      socket.emit('userUpdate', {
        user: deletedUser,
        type: 'deleted',
      });
      res.status(200).json(deletedUser);
    } catch (error) {
      res.status(500).send(`Error when deleting user by username: ${error}`);
    }
  };

  /**
   * Resets a user's password.
   * @param req The request containing the username and new password in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const resetPassword = async (req: UserRequest, res: Response): Promise<void> => {
    try {
      const updatedUser = await updateUser(req.body.username, { password: req.body.password });

      if ('error' in updatedUser) {
        throw Error(updatedUser.error);
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user password: ${error}`);
    }
  };

  /**
   * Updates a user's biography.
   * @param req The request containing the username and biography in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const updateBiography = async (req: UpdateBiographyRequest, res: Response): Promise<void> => {
    try {
      // Validate that request has username and biography
      const { username, biography } = req.body;

      // Call the same updateUser(...) service used by resetPassword
      const updatedUser = await updateUser(username, { biography });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      // Emit socket event for real-time updates
      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user biography: ${error}`);
    }
  };

  /**
   * Updates a user's loginStreak visibility
   * @param req The request containing the username and showLoginStreak in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns a promise resolving to void.
   */
  const updateShowLoginStreak = async (
    req: UpdateShowLoginStreakRequest,
    res: Response,
  ): Promise<void> => {
    try {
      // Validate that request has username and showLoginStreak
      const { username, showLoginStreak } = req.body;

      if (!username || showLoginStreak == null) {
        res.status(400).send('No username or login streak visibility provided');
        return;
      }

      // Call the same updateUser(...) service used by resetPassword
      const updatedUser = await updateUser(username, { showLoginStreak });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      // Emit socket event for real-time updates
      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user login streak visibility: ${error}`);
    }
  };

  /**
   * Toggles hold state on a user's current streak.
   * @param req The request containing the username of the user.
   * @param res The response, either confirming the update or returning an error.
   * @returns a promise resolving to void.
   */
  const toggleStreakHold = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      // Get current user to toggle streak hold
      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      // Build updates object
      const updates: Partial<User> = {
        streakHold: !currentUser.streakHold,
      };

      // If turning off streak hold, update lastLogin and clear missedDays
      // Set lastLogin to yesterday so next login will be consecutive
      if (currentUser.streakHold === true) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        updates.lastLogin = yesterday;
        updates.missedDays = 0;
      }

      const updatedUser = await updateUser(username, updates);

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error toggling streak hold: ${error}`);
    }
  };

  /*
   * Updates a user's status and custom status message.
   * @param req The request containing username, status, and optional customStatus in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const updateStatus = async (req: UpdateStatusRequest, res: Response): Promise<void> => {
    try {
      const { username, status, customStatus } = req.body;

      const updatedUser = await updateUserStatus(username, status, customStatus);

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      // Emit socket event for real-time status updates
      socket.emit('userStatusUpdate', {
        username,
        status,
        customStatus,
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user status: ${error}`);
    }
  };

  /**
   * Uploads and updates a user's profile picture.
   * @param req The request containing the image file and username in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).send('No file uploaded');
        return;
      }

      const { username, cropData } = req.body;

      if (!username) {
        res.status(400).send('Username is required');
        return;
      }

      // Parse crop data if provided
      let parsedCropData;
      if (cropData) {
        parsedCropData = JSON.parse(cropData);
      }

      // Process and get base64 encoded image
      const base64Image = await processProfilePicture(req.file, parsedCropData);

      // Update user with new profile picture (base64 string)
      const updatedUser = await updateUser(username, { profilePicture: base64Image });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error uploading profile picture: ${error}`);
    }
  };

  /**
   * Uploads and updates a user's banner image.
   * @param req The request containing the image file and username in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const uploadBannerImage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).send('No file uploaded');
        return;
      }

      const { username, cropData } = req.body;

      if (!username) {
        res.status(400).send('Username is required');
        return;
      }

      // Parse crop data if provided
      let parsedCropData;
      if (cropData) {
        parsedCropData = JSON.parse(cropData);
      }

      // Process and get base64 encoded image
      const base64Image = await processBannerImage(req.file, parsedCropData);

      // Update user with new banner image (base64 string)
      const updatedUser = await updateUser(username, { bannerImage: base64Image });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error uploading banner image: ${error}`);
    }
  };

  /**
   * Toggles a user's profile privacy setting.
   * @param req The request containing the username in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const toggleProfilePrivacy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      // Get current user to toggle the privacy setting
      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      // Toggle the profilePrivate field
      const updatedUser = await updateUser(username, {
        profilePrivate: !currentUser.profilePrivate,
      });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error toggling profile privacy: ${error}`);
    }
  };

  /**
   * Updates user's premium profile status to active.
   * @param req The request, containing the user's username.
   * @param res The reponse, containing the updated user.
   */
  const activatePremium = async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      if (currentUser.premiumProfile == true) {
        res.status(402).send('User already has premium profile.');
        return;
      }

      const updatedUser = await updateUser(username, { premiumProfile: true, streakPass: 3 });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      // Emit socket event for real-time updates
      socket.emit('premiumUpdate', {
        username: username,
        premiumStatus: updatedUser.premiumProfile,
        streakPass: updatedUser.streakPass,
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error activating premium profile: ${error}`);
    }
  };

  /**
   * Verifies a JWT token and returns the user data if valid.
   * @param req The request containing the token in the Authorization header.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const verifyTokenRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { _id: userId } = req.user;

      // Get user data from database using the decoded username
      const user = await populateUser(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).send(`Error verifying token: ${error}`);
    }
  };

  /**
   * Handles transactions where coins are added to a user's account.
   * Request must contain the user's username and the cost of the transaction.
   * Optionally it may also include a description of the transaction event.
   * @param req The TransactionRequest object containing the username, cost, and description.
   * @param res The response, containing either the updated user or an error.
   */
  const addCoinTransaction = async (req: TransactionRequest, res: Response): Promise<void> => {
    coinTransaction(req, res, 'add');
  };

  /**
   * Handles transactions where coins are reduced from a user's account.
   * Request must contain the user's username and the cost of the transaction.
   * Optionally it may also include a description of the transaction event.
   * @param req The TransactionRequest object containing the username, cost, and description.
   * @param res The response, containing either the updated user or an error.
   */
  const reduceCoinTransaction = async (req: TransactionRequest, res: Response): Promise<void> => {
    coinTransaction(req, res, 'reduce');
  };

  /**
   * Helper function to handle adding or reducing coins from user.
   *
  n* @param req The TransactionRequest object containing the username, cost, and description.
   * @param res The response, containing either the updated user or an error.
   * @param type The type of transaction to perform (add/ reduce).
   */
  const coinTransaction = async (
    req: TransactionRequest,
    res: Response,
    type: 'add' | 'reduce',
  ): Promise<void> => {
    try {
      const { username, cost } = req.body;

      if (!username || !cost) {
        res.status(400).send('Username and cost must be provided');
        return;
      } else if (cost < 0) {
        res.status(400).send('Invalid cost provided');
        return;
      }

      let status;

      if (type == 'add') {
        status = await makeTransaction(username, cost, type);
      } else {
        status = await makeTransaction(username, cost, type);
      }

      if ('error' in status) {
        if (status.error.includes('Not enough coins to make transaction')) {
          res.status(402).send(status.error);
          return;
        }
        throw new Error(status.error);
      }

      const amount = status.coins;

      socket.emit('transactionEvent', {
        username,
        amount: amount ?? 0,
      });
      res.status(200).json(status);
    } catch (err: unknown) {
      res.status(500).json({ error: `Error making transaction: ${(err as Error).message}` });
    }
  };

  /**
   * Decrements the number of user's streak passes by 1.
   * @param req The request containing the username of the user.
   * @param res The response, either confirming the update or returning an error.
   * @returns a promise resolving to void.
   */
  const decrementStreakPasses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      // Get current user to decrement streak passes
      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      if (!currentUser.streakPass || (currentUser.streakPass && currentUser.streakPass <= 0)) {
        res.status(402).send('User has no streak passes to decrement.');
        return;
      }
      // Decrement streakPass field
      const updatedUser = await updateUser(username, {
        streakPass: currentUser.streakPass - 1,
      });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error decrementing user's streak passes: ${error}`);
    }
  };

  /**
   * Resets user's login streak to 1.
   * @param req The request containing the username of the user.
   * @param res The response, either confirming the update or returning an error.
   * @returns a promise resolving to void.
   */
  const resetLoginStreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      const updatedUser = await updateUser(username, {
        loginStreak: 1,
      });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error reseting user's login streak: ${error}`);
    }
  };

  const readNotificationsRoute = async (
    req: ReadNotificationRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { username, notificationIds } = req.body;

      const updatedUser = await readNotifications(username, notificationIds);

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Toggles a user's community notification setting.
   * @param req The request containing the username in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const toggleCommunityNotifs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      // Get current user to toggle the community notification status
      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      const newCommNotif =
        typeof currentUser.communityNotifs == 'boolean' ? !currentUser.communityNotifs : false;

      // Toggle the communityNotifs field
      const updatedUser = await updateUser(username, {
        communityNotifs: newCommNotif,
      });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error toggling notifications for communities: ${error}`);
    }
  };

  /**
   * Toggles a user's message notification setting.
   * @param req The request containing the username in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const toggleMessageNotifs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).send('Username must be provided');
        return;
      }

      // Get current user to toggle the messages notification status
      const currentUser = await getUserByUsername(username);

      if ('error' in currentUser) {
        throw new Error(currentUser.error);
      }

      const newMsgNotif =
        typeof currentUser.messageNotifs == 'boolean' ? !currentUser.messageNotifs : false;

      // Toggle the messageNotifs field
      const updatedUser = await updateUser(username, {
        messageNotifs: newMsgNotif,
      });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error toggling notifications for all messages: ${error}`);
    }
  };

  /**
   * Blocks a user by adding them to the current user's blocked list.
   * @param req The request containing username and targetUsername in the body.
   * @param res The response, either confirming the block or returning an error.
   * @returns A promise resolving to void.
   */
  const blockUserRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, targetUsername } = req.body;

      if (!username || !targetUsername) {
        res.status(400).send('Username and targetUsername must be provided');
        return;
      }

      const result = await blockUser(username, targetUsername);

      if ('error' in result) {
        const errorMsg = result.error;
        if (errorMsg.includes('cannot block yourself')) {
          res.status(400).json({ error: errorMsg });
        } else if (errorMsg.includes('not found')) {
          res.status(404).json({ error: errorMsg });
        } else if (errorMsg.includes('already blocked')) {
          res.status(409).json({ error: errorMsg });
        } else {
          res.status(500).json({ error: errorMsg });
        }
        return;
      }

      socket.emit('userUpdate', {
        user: result,
        type: 'updated',
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error blocking user: ${error}`);
    }
  };

  /**
   * Unblocks a user by removing them from the current user's blocked list.
   * @param req The request containing username and targetUsername in the body.
   * @param res The response, either confirming the unblock or returning an error.
   * @returns A promise resolving to void.
   */
  const unblockUserRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, targetUsername } = req.body;

      if (!username || !targetUsername) {
        res.status(400).send('Username and targetUsername must be provided');
        return;
      }

      const result = await unblockUser(username, targetUsername);

      if ('error' in result) {
        res.status(500).json({ error: result.error });
        return;
      }

      socket.emit('userUpdate', {
        user: result,
        type: 'updated',
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error unblocking user: ${error}`);
    }
  };

  // Define routes for the user-related operations.
  router.post('/signup', createUser);
  router.post('/login', userLogin);
  router.get('/verify-token', protect, verifyTokenRoute);
  router.patch('/resetPassword', protect, resetPassword);
  router.get('/getUser/:username', protect, getUser);
  router.get('/getUsers', protect, getUsers);
  router.delete('/deleteUser/:username', protect, deleteUser);
  router.patch('/updateBiography', protect, updateBiography);
  router.post(
    '/uploadProfilePicture',
    protect,
    upload.single('profilePicture'),
    uploadProfilePicture,
  );
  router.post('/uploadBannerImage', protect, upload.single('bannerImage'), uploadBannerImage);
  router.patch('/toggleStreakHold', protect, toggleStreakHold);
  router.patch('/decrementStreakPasses', protect, decrementStreakPasses);
  router.patch('/toggleProfilePrivacy', protect, toggleProfilePrivacy);
  router.patch('/activatePremium', protect, activatePremium);
  router.patch('/updateShowLoginStreak', protect, updateShowLoginStreak);
  router.patch('/updateStatus', protect, updateStatus);
  router.patch('/addCoins', protect, addCoinTransaction);
  router.patch('/reduceCoins', protect, reduceCoinTransaction);
  router.patch('/readNotifications', readNotificationsRoute);
  router.patch('/resetLoginStreak', protect, resetLoginStreak);
  router.patch('/toggleCommunityNotifs', protect, toggleCommunityNotifs);
  router.patch('/toggleMessageNotifs', protect, toggleMessageNotifs);
  router.patch('/blockUser', protect, blockUserRoute);
  router.patch('/unblockUser', protect, unblockUserRoute);

  return router;
};

export default userController;
