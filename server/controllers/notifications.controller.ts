import express, { Router, Request, Response } from 'express';
import { FakeSOSocket } from '../types/types';
import protect from '../middleware/token.middleware';
import {
  addNotificationToUsers,
  readAllNotifications,
  saveNotification,
} from '../services/notification.service';
import {
  SendNotificationRequest,
  ReadNotificationRequest,
} from '@fake-stack-overflow/shared/types/notification';
import NotificationModel from '../models/notifications.model';

const notificationController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  const sendNotification = async (req: SendNotificationRequest, res: Response): Promise<void> => {
    try {
      const { notification } = req.body;

      const savedNotif = await saveNotification(notification);

      if (savedNotif && 'error' in savedNotif) {
        throw new Error(savedNotif.error as string);
      }

      const status = await addNotificationToUsers(savedNotif);

      if (status && 'error' in status) {
        throw new Error(status.error as string);
      }

      socket.emit('notificationUpdate', {
        notification: savedNotif,
      });

      res.json(savedNotif);
    } catch (error) {
      res.status(500).send(`Error when sending notification: ${(error as Error).message}`);
    }
  };

  const readNotification = async (req: ReadNotificationRequest, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.body;

      const readNotif = await NotificationModel.findByIdAndUpdate(
        notificationId,
        {
          $set: { read: true },
        },
        { new: true },
      );

      if (!readNotif) {
        throw new Error('Error reading notification');
      }

      socket.emit('readUpdate', { notification: readNotif });
      res.json(readNotif);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  const readAllNotificationsRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const username = req.user?.username;

      if (!username) {
        throw new Error('Username is required');
      }

      const updatedNotifications = await readAllNotifications(username);

      socket.emit('readAllUpdate', { notifications: updatedNotifications });

      res.json(updatedNotifications);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  router.post('/sendNotification', sendNotification);
  router.patch('/readNotification', readNotification);
  router.patch('/readAllNotifications', protect, readAllNotificationsRoute);

  return router;
};

export default notificationController;
