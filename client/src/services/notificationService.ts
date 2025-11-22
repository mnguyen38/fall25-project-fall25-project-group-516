import {
  CommunityPSA,
  DatabaseNotification,
  Notification,
} from '@fake-stack-overflow/shared/types/notification';
import api from './config';

const NOTIFICATIONS_API_URL = `/api/notifications`;

export const getNotifications = async (): Promise<DatabaseNotification[]> => {
  const res = await api.get(`${NOTIFICATIONS_API_URL}/getNotifications`);

  if (res.status !== 200) {
    throw new Error('Error when fetching user badges');
  }
  return res.data;
};

export const readNotification = async (notificationId: string): Promise<DatabaseNotification> => {
  const res = await api.patch(`${NOTIFICATIONS_API_URL}/readNotification`, { notificationId });

  if (res.status !== 200) {
    throw new Error('Error when marking notification as read');
  }

  return res.data;
};

export const readAllNotifications = async (): Promise<DatabaseNotification[]> => {
  const res = await api.patch(`${NOTIFICATIONS_API_URL}/readAllNotifications`);

  if (res.status !== 200) {
    throw new Error('Error when marking all notifications as read');
  }
  return res.data;
};

export const sendNotification = async (
  notification: Notification,
): Promise<DatabaseNotification> => {
  const res = await api.post(`${NOTIFICATIONS_API_URL}/sendNotification`, notification);

  if (res.status !== 200) {
    throw new Error('Error when sending notification');
  }

  return res.data;
};

export const sendPSA = async (
  communityId: string,
  psa: CommunityPSA,
): Promise<DatabaseNotification[]> => {
  const data = { communityId, psa };
  const res = await api.post(`${NOTIFICATIONS_API_URL}/sendPSA`, data);

  if (res.status !== 200) {
    throw new Error('Error when sending PSA');
  }

  return res.data;
};



