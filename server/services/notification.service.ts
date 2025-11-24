import {
  DatabaseNotification,
  Notification,
  NotificationResponse,
} from '@fake-stack-overflow/shared/types/notification';
import UserModel from '../models/users.model';
import NotificationModel from '../models/notifications.model';
import mongoose, { ClientSession } from 'mongoose';

/**
 * Saves a notification to the database.
 * Supports an optional session for transactions.
 */
export const saveNotification = async (
  notificationData: Notification,
  session?: ClientSession,
): Promise<NotificationResponse> => {
  try {
    const result = await NotificationModel.create([{ ...notificationData }], {
      session,
    });
    return result[0];
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Adds a notification reference to the recipients user documents.
 * If a session is provided, it uses it without closing it.
 * If no session is provided, it creates a new transaction and manages its lifecycle.
 */
export const addNotificationToUsers = async (
  recipients: string[],
  notif: DatabaseNotification,
  externalSession?: ClientSession,
): Promise<void | { error: string }> => {
  const session = externalSession || (await mongoose.startSession());
  const isInternalSession = !externalSession;

  if (isInternalSession) {
    session.startTransaction();
  }
  try {
    // Validate fields
    if (!notif || !notif.msg || !notif.sender || !notif.dateTime || !notif.title) {
      throw new Error('Invalid Notification');
    }

    let result;

    if (notif.type == 'community') {
      result = await UserModel.updateMany(
        {
          username: { $in: recipients },
          communityNotifs: true,
        },
        {
          $push: {
            notifications: {
              $each: [{ notification: notif._id, read: false }], // Correct structure
              $position: 0,
            },
          },
        },
      ).session(session);
    } else if (notif.type == 'message') {
      result = await UserModel.updateMany(
        {
          username: { $in: recipients },
          messageNotifs: true,
        },
        {
          $push: {
            notifications: {
              $each: [{ notification: notif._id, read: false }], // Correct structure
              $position: 0,
            },
          },
        },
      ).session(session);
    } else {
      result = await UserModel.updateMany(
        {
          username: { $in: recipients },
        },
        {
          $push: {
            notifications: {
              $each: [{ notification: notif._id, read: false }], // Correct structure
              $position: 0,
            },
          },
        },
      ).session(session);
    }

    if (!result) {
      throw new Error('Update failed');
    }

    if (isInternalSession) {
      await session.commitTransaction();
    }
  } catch (error) {
    if (isInternalSession) {
      await session.abortTransaction();
    }
    return { error: (error as Error).message };
  } finally {
    if (isInternalSession) {
      await session.endSession();
    }
  }
};

/**
 * Encapsulates the process of saving a notification and adding it to the users.
 * Manages the transaction lifecycle internally.
 *
 * @param notification - The notification object to send.
 * @returns The saved notification object or an error object.
 */
export const sendNotification = async (
  recipients: string[],
  notification: Notification,
): Promise<NotificationResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const savedNotification = await saveNotification(notification, session);

    if ('error' in savedNotification) {
      throw new Error(`1: ${savedNotification.error}`);
    }

    const addStatus = await addNotificationToUsers(recipients, savedNotification, session);

    if (addStatus && 'error' in addStatus) {
      throw new Error(`2: ${addStatus.error}`);
    }

    await session.commitTransaction();
    return savedNotification;
  } catch (error) {
    await session.abortTransaction();
    return { error: `3: ${(error as Error).message}` };
  } finally {
    await session.endSession();
  }
};
