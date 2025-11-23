import { DatabaseUser, User } from '@fake-stack-overflow/shared';
import { ReferenceResolver } from '../../types/populate';
import { resolveRefs } from './helpers';

const userResolver: ReferenceResolver<User, Omit<DatabaseUser, '_id'>> = (doc, insertedDocs) => {
  // 1. Resolve the array of IDs (e.g., returns [ObjectId, ObjectId])
  const resolvedIds = resolveRefs(
    (doc.notifications as unknown as string[]) || [],
    insertedDocs.notification,
    'Notification',
  );

  return {
    ...doc,
    // 2. Map over the resolved IDs to create the object structure required by Mongoose
    notifications: resolvedIds.map(notificationId => ({
      notification: notificationId,
      read: false, // Defaulting read status to false
    })),
  };
};

export default userResolver;
