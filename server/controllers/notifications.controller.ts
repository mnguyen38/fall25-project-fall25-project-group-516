import express, { Router, Request, Response } from 'express';
import { FakeSOSocket } from '../types/types';
import protect from '../middleware/token.middleware';
import { getNotificationsList } from '../services/notification.service';

const notificationController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  const getNotifications = async (req: Request, res: Response): Promise<void> => {
     if (!req.user) {
      res.status(401).json({ error: 'User not authorized' });
      return;
    }

    const userId = req.user._id;

    const result = await getNotificationsList(userId);
    res.json(result);
  };

  const sendNotification = async (req: Request, res: Response): Promise<void> => {};

  router.get('/getNotifications', protect, getNotifications);
  router.post('/sendNotification', protect, sendNotification);

  return router;
};

export default notificationController;
