import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import api from './config';

const NOTIFICATIONS_API_URL = `/api/notifications`;

export const getNotifications = async (): Promise<DatabaseNotification[]> => {
  const res = await api.get(`${NOTIFICATIONS_API_URL}/getNotifications`);

  if (res.status !== 200) {
    throw new Error('Error when fetching user badges');
  }
  return res.data;
};
