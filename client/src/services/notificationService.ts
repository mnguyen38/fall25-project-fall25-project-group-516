import { DatabaseNotification, Notification } from '@fake-stack-overflow/shared/types/notification';
import api from './config';

const NOTIFICATIONS_API_URL = `/api/notifications`;

const sendNotification = async (notification: Notification): Promise<DatabaseNotification> => {
  const res = await api.post(`${NOTIFICATIONS_API_URL}/sendNotification`, notification);

  if (res.status !== 200) {
    throw new Error('Error when sending notification');
  }

  return res.data;
};

export default sendNotification;
