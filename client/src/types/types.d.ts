import { Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@fake-stack-overflow/shared/types/types';

export * from '@fake-stack-overflow/shared/types/types';

export type FakeSOSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ModToolSections = 'users' | 'danger' | 'announcement' | null;

export type ModToolConfirmation = ModToolAction | null;

export interface ModToolAction {
  action: 'mod' | 'ban' | 'mute';
  username: string;
}
