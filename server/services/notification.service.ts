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
  session?: ClientSession, // Added optional session
): Promise<NotificationResponse> => {
  try {
    const result = await NotificationModel.create([{ ...notificationData, read: false }], {
      session,
    });
    return result[0];
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Adds a notification reference to the receivers' user documents.
 * If a session is provided, it uses it without closing it.
 * If no session is provided, it creates a new transaction and manages its lifecycle.
 */
export const addNotificationToUsers = async (
  notif: DatabaseNotification,
  externalSession?: ClientSession, // Added optional session
): Promise<void | { error: string }> => {
  const session = externalSession || (await mongoose.startSession());

  const isInternalSession = !externalSession;

  if (isInternalSession) {
    session.startTransaction();
  }

  try {
    if (
      !notif ||
      !notif.msg ||
      !notif.sender ||
      !notif.dateTime ||
      !notif.receivers ||
      notif.receivers.length === 0 ||
      !notif.title
    ) {
      throw new Error('Invalid Notification');
    }

    const result = await UserModel.updateMany(
      {
        username: { $in: notif.receivers },
      },
      { $push: { notifications: { $each: [notif._id], $position: 0 } } },
    ).session(session);

    if (result.modifiedCount !== notif.receivers.length) {
      console.warn(
        `Expected to update ${notif.receivers.length} users, but only updated ${result.modifiedCount}`,
      );
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

export const readAllNotifications = async (
  username: string,
): Promise<DatabaseNotification[] | { error: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const notificationsToUpdate = await NotificationModel.find({
      receiver: username,
      read: false,
    }).session(session);

    if (notificationsToUpdate.length > 0) {
      await NotificationModel.updateMany(
        { receiver: username, read: false },
        { $set: { read: true } },
      ).session(session);
    }

    await session.commitTransaction();

    const updatedNotifications = notificationsToUpdate.map(notif => {
      notif.read = true;
      return notif;
    });
    return updatedNotifications;
  } catch (error) {
    await session.abortTransaction();
    return { error: (error as Error).message };
  } finally {
    await session.endSession();
  }
};
