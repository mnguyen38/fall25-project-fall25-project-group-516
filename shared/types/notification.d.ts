import { ObjectId } from 'mongodb';
import { Request } from 'express';

import { User } from './user';

export type NotificationType =
  | 'comment'
  | 'answer'
  | 'community'
  | 'message'
  | 'sitewide'
  | 'report'
  | 'unban';

export interface Notification {
  title: string;
  msg: string;
  dateTime: Date;
  sender: string;
  contextId: ObjectId | null;
  read: boolean;
  type: NotificationType;
}

export interface DatabaseNotification extends Notification {
  _id: ObjectId;
}

export type NotificationResponse = DatabaseNotification | null;

export interface NotificationRequest extends Request {
  body: {
    notificationToSend: Notification;
  };
}
