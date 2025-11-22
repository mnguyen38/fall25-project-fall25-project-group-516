import { PopulatedDatabaseAnswer } from './answer';
import { PopulatedDatabaseChat } from './chat';
import { DatabaseMessage } from './message';
import { PopulatedDatabaseQuestion } from './question';
import { SafeDatabaseUser } from './user';
import { BaseMove, GameInstance, GameInstanceID, GameMove, GameState } from './game';
import { DatabaseCommunity } from './community';
import { PopulatedDatabaseCollection } from './collection';
import { DatabaseBadge } from './badge';

/**
 * Payload for an answer update event.
 * - `qid`: The unique identifier of the question.
 * - `answer`: The updated answer.
 */
export interface AnswerUpdatePayload {
  qid: ObjectId;
  answer: PopulatedDatabaseAnswer;
}

/**
 * Payload for a game state update event.
 * - `gameInstance`: The updated instance of the game.
 */
export interface GameUpdatePayload {
  gameInstance: GameInstance<GameState>;
}

/**
 * Payload for a game operation error event.
 * - `player`: The player ID who caused the error.
 * - `error`: The error message.
 */
export interface GameErrorPayload {
  player: string;
  error: string;
}

/**
 * Payload for a vote update event.
 * - `qid`: The unique identifier of the question.
 * - `upVotes`: An array of usernames who upvoted the question.
 * - `downVotes`: An array of usernames who downvoted the question.
 */
export interface VoteUpdatePayload {
  qid: string;
  upVotes: string[];
  downVotes: string[];
}

/**
 * Payload for a chat update event.
 * - `chat`: The updated chat object.
 * - `type`: The type of update (`'created'`, `'newMessage'`, or `'newParticipant'`).
 */
export interface ChatUpdatePayload {
  chat: PopulatedDatabaseChat;
  type: 'created' | 'newMessage' | 'newParticipant';
}

/**
 * Payload for a comment update event.
 * - `result`: The updated question or answer.
 * - `type`: The type of the updated item (`'question'` or `'answer'`).
 */
export interface CommentUpdatePayload {
  result: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
  type: 'question' | 'answer';
}

/**
 * Payload for a message update event.
 * - `msg`: The updated message.
 */
export interface MessageUpdatePayload {
  msg: DatabaseMessage;
}

/**
 * Payload for a user update event.
 * - `user`: The updated user object.
 * - `type`: The type of modification (`'created'`, `'deleted'`, or `'updated'`).
 */
export interface UserUpdatePayload {
  user: SafeDatabaseUser;
  type: 'created' | 'deleted' | 'updated';
}

/**
 * Interface representing the payload for a game move operation, which contains:
 * - `gameID`: The ID of the game being played.
 * - `move`: The move being made in the game, defined by `GameMove`.
 */
export interface GameMovePayload {
  gameID: GameInstanceID;
  move: GameMove<BaseMove>;
}

/**
 * Interface representing the payload for a community update event.
 * - `type`: The type of update (`'created'`, `'updated'`, or `'deleted'`).
 * - `community`: The updated community object.
 */
export interface CommunityUpdatePayload {
  type: 'created' | 'updated' | 'deleted';
  community: DatabaseCommunity;
}

/**
 * Interface representing the payload for a collection update event.
 * - `type`: The type of update (`'created'`, `'updated'`, or `'deleted'`).
 * - `collection`: The updated collection object.
 */
export interface CollectionUpdatePayload {
  type: 'created' | 'updated' | 'deleted';
  collection: PopulatedDatabaseCollection;
}

/**
 * Interface representing the payload for a badge update event.
 * - `badge`: The badge that was created or updated.
 * - `type`: The type of update (`'created'` or `'updated'`).
 */
export interface BadgeUpdatePayload {
  badge: DatabaseBadge;
  type: 'created' | 'updated';
}

/**
 * Interface representing the payload for a badge awarded event.
 * - `username`: The username of the user who earned badges.
 * - `badges`: The array of newly earned badges.
 */
export interface BadgeAwardedPayload {
  username: string;
  badges: DatabaseBadge[];
}

/**
 * Interface representing payload for a transaction event.
 * - `username`: The username of the user who earned the coins.
 * - `amount`: The new number of coins of the user.
 */
export interface TransactionEventPayload {
  username: string;
  amount: number;
}

export interface PremiumUpdatePayload {
  username: string;
  premiumMembership: boolean;
}

/**
 * Payload for a user connection event.
 * - `username`: The username of the user who connected.
 */
export interface UserConnectedPayload {
  username: string;
}

/**
 * Payload for a user status update event.
 * - `username`: The username of the user whose status changed.
 * - `status`: The new status ('online', 'busy', 'away').
 * - `customStatus`: Optional custom status message.
 */
export interface UserStatusUpdatePayload {
  username: string;
  status: 'online' | 'busy' | 'away';
  customStatus?: string;
}

/**
 * Interface representing the events the client can emit to the server.
 * - `makeMove`: Client can emit a move in the game.
 * - `joinGame`: Client can join a game.
 * - `leaveGame`: Client can leave a game.
 * - `joinChat`: Client can join a chat.
 * - `leaveChat`: Client can leave a chat.
 * - `userConnected`: Client notifies server when user connects.
 */
export interface ClientToServerEvents {
  makeMove: (move: GameMovePayload) => void;
  joinGame: (gameID: string) => void;
  leaveGame: (gameID: string) => void;
  joinChat: (chatID: string) => void;
  leaveChat: (chatID: string | undefined) => void;
  userConnected: (payload: UserConnectedPayload) => void;
}

/**
 * Interface representing the events the server can emit to the client.
 * - `questionUpdate`: Server sends updated question.
 * - `answerUpdate`: Server sends updated answer.
 * - `viewsUpdate`: Server sends updated views count for a question.
 * - `voteUpdate`: Server sends updated votes for a question.
 * - `commentUpdate`: Server sends updated comment for a question or answer.
 * - `messageUpdate`: Server sends updated message.
 * - `userUpdate`: Server sends updated user status.
 * - `gameUpdate`: Server sends updated game state.
 * - `gameError`: Server sends error message related to game operation.
 * - `chatUpdate`: Server sends updated chat.
 * - `communityUpdate`: Server sends updated community.
 * - `collectionUpdate`: Server sends updated collection.
 * - `badgeUpdate`: Server sends updated badge.
 * - `badgeAwarded`: Server notifies when badges are awarded to a user.
 * - `transactionEvent`: Server notifies when transaction goes through.
 * - `premiumUpdate`: Server notifies when user's premium membership status changes.
 */
export interface ServerToClientEvents {
  questionUpdate: (question: PopulatedDatabaseQuestion) => void;
  answerUpdate: (result: AnswerUpdatePayload) => void;
  viewsUpdate: (question: PopulatedDatabaseQuestion) => void;
  voteUpdate: (vote: VoteUpdatePayload) => void;
  commentUpdate: (comment: CommentUpdatePayload) => void;
  messageUpdate: (message: MessageUpdatePayload) => void;
  userUpdate: (user: UserUpdatePayload) => void;
  userStatusUpdate: (status: UserStatusUpdatePayload) => void;
  gameUpdate: (game: GameUpdatePayload) => void;
  gameError: (error: GameErrorPayload) => void;
  chatUpdate: (chat: ChatUpdatePayload) => void;
  communityUpdate: (community: CommunityUpdatePayload) => void;
  collectionUpdate: (community: CollectionUpdatePayload) => void;
  badgeUpdate: (badge: BadgeUpdatePayload) => void;
  badgeAwarded: (awarded: BadgeAwardedPayload) => void;
  transactionEvent: (transaction: TransactionPayload) => void;
  premiumUpdate: (status: PremiumUpdatePayload) => void;
}
