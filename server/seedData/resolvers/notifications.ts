import { ReferenceResolver } from '../../types/populate'; // Adjust path if needed
import {
  DatabaseNotification,
  NotificationType,
  Notification,
} from '@fake-stack-overflow/shared/types/notification';
import { resolveSingleRef } from './helpers';

/**
 * Maps notification types to the collection/entity name they reference.
 * Adjust these keys and values to match your system's entity names.
 */
const notificationContextMap: Record<NotificationType, string> = {
  comment: 'Question', // Or 'Comment' if you insert Comments separately
  answer: 'Question', // Or 'Answer'
  community: 'Community',
  message: 'Chat', // Or 'Message'
  sitewide: 'User', // Or null if no context
  report: 'Report',
  unban: 'Community',
};

/**
 * Resolver for notification documents.
 * Resolves contextId references from their string IDs to ObjectId references.
 */
const notificationResolver: ReferenceResolver<Notification, Omit<DatabaseNotification, '_id'>> = (
  doc,
  insertedDocs,
) => {
  // Determine the target collection based on the notification type
  const targetCollection = notificationContextMap[doc.type];

  // If no target collection is mapped or contextId is missing, return doc as is (or with null context)
  if (!targetCollection || !doc.contextId) {
    return {
      ...doc,
      contextId: null,
    };
  }

  return {
    ...doc,
    // Dynamically resolve the reference based on the type
    contextId: resolveSingleRef(
      doc.contextId as unknown as string,
      insertedDocs[targetCollection.toLowerCase()], // accessing e.g. insertedDocs.question
      targetCollection,
    ),
  };
};

export default notificationResolver;
