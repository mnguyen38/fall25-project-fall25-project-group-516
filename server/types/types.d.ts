import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@fake-stack-overflow/shared';

// export * from '../../shared/src/types/types';
export * from '@fake-stack-overflow/shared';

/**
 * Type alias for the Socket.io Server instance.
 * - Handles communication between the client and server using defined events.
 */
export type FakeSOSocket = Server<ClientToServerEvents, ServerToClientEvents>;

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export interface OAuthUserProfile {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      _id: string;
      username: string;
      email?: string;
    };
  }
}
