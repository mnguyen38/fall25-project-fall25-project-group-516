import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import UserModel from '../models/users.model';
import NotificationModel from '../models/notifications.model';

export const getNotificationsList = async (
  userId: string,
): Promise<DatabaseNotification[] | { error: string }> => {
  try {
    const result: DatabaseNotification[] | null = await populateNotificationList(userId);

    if (!result) {
      throw new Error('Notification list for this user does not exist');
    }

    return result;
  } catch {
    return [];
  }
};

const populateNotificationList = async (userID: string): Promise<DatabaseNotification[] | null> => {
  const result = await UserModel.findOne({ _id: userID }).populate<{
    notifications: DatabaseNotification[];
  }>([{ path: 'notifications', model: NotificationModel }]);

  if (!result) {
    throw new Error('User not found');
  }

  return result.notifications;
};
