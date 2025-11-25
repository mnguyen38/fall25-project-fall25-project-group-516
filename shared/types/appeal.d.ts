import { ObjectId } from 'mongodb';

/**
 * Shared type definitions for appeal data exchanged between the server and client.
 *
 * - `Appeal` captures the information users submit when creating an appeal.
 * - `DatabaseAppeal` extends `Appeal` with the `_id` MongoDB identifier retrieved from the database.
 */
export interface Appeal {
  community: ObjectId;
  username: string;
  description: string;
  appealDateTime: Date;
}

export interface DatabaseAppeal extends Appeal {
  _id: ObjectId;
}

export type AppealResponse = DatabaseAppeal | { error: string };
