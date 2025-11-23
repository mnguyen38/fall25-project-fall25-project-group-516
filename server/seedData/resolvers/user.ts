import { DatabaseUser, User } from '@fake-stack-overflow/shared';
import { ReferenceResolver } from '../../types/populate';
import { resolveRefs } from './helpers';

const userResolver: ReferenceResolver<User, Omit<DatabaseUser, '_id'>> = (doc, insertedDocs) => ({
  ...doc,
  notifications: resolveRefs(
    (doc.notifications as unknown as string[]) || [],
    insertedDocs.notification,
    'Notification',
  ),
});

export default userResolver;
