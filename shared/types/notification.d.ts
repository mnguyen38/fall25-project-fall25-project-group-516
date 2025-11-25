import { ObjectId } from 'mongodb';
import { Request } from 'express';

/**
 * Enumeration of all possible notification types in the system.
 * Each type represents a different category of notification that can be sent to users.
 */
export type NotificationType =
  | 'comment' // Notification for comments on posts/questions
  | 'answer' // Notification for answers to questions
  | 'community' // Community-related notifications (e.g., PSAs)
  | 'message' // Direct message notifications
  | 'sitewide' // Site-wide announcements
  | 'report' // Notifications related to content reports
  | 'appeal' // Notification when a user is unbanned
  | 'ban'
  | 'mute';

/**
 * Base notification interface representing a notification in the system.
 * Contains all the essential information needed to display and track a notification.
 */
export interface Notification {
  title: string;
  msg: string;
  dateTime: Date;
  sender: string;
  contextId: ObjectId | null;
  type: NotificationType;
}

/**
 * Notification as stored in the database.
 * Extends the base Notification interface with the MongoDB document ID.
 *
 * @extends {Notification}
 */
export interface DatabaseNotification extends Notification {
  _id: ObjectId;
}

/**
 * Response type for notification API operations.
 * Can either return a successfully retrieved notification or an error object.
 */
export type NotificationResponse = DatabaseNotification | { error: string };

/**
 * Express request interface for sending a new notification.
 * Extends the base Express Request with a body containing the notification to be sent.
 *
 * @extends {Request}
 */
export interface SendNotificationRequest extends Request {
  body: {
    recipients: string[];
    notification: Notification;
  };
}

/**
 * Interface representing a user's notifications retrieved from the database.
 * Contains an array of database notification documents, typically used when
 * fetching all notifications for a specific user.
 */
export interface PopulatedDatabaseUserNotifications {
  notifications: DatabaseNotification[];
}
