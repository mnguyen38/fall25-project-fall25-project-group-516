import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import mongoose, { Model } from 'mongoose';
import notificationSchema from './schema/notification.schema';

const NotificationModel: Model<DatabaseNotification> = mongoose.model<DatabaseNotification>(
  'Notification',
  notificationSchema,
);

export default NotificationModel;
