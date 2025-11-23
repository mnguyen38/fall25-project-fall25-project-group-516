import express, { Router, Response } from 'express';
import { FakeSOSocket } from '../types/types';
import { sendNotification } from '../services/notification.service';
import { SendNotificationRequest } from '@fake-stack-overflow/shared/types/notification';

const notificationController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  const sendNotificationRoute = async (
    req: SendNotificationRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { recipients, notification } = req.body;

      const result = await sendNotification(recipients, notification);

      if ('error' in result) {
        throw new Error(result.error);
      }

      socket.emit('notificationUpdate', {
        notification: result,
      });

      res.json(result);
    } catch (error) {
      res.status(500).send(`Error when sending notification: ${(error as Error).message}`);
    }
  };

  router.post('/sendNotification', sendNotificationRoute);

  return router;
};

export default notificationController;
