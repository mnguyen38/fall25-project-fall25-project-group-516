import { ObjectId } from 'mongodb';
import { Request } from 'express';
import { Notification } from './notification';

/**
 * Represents a Community (unpopulated).
 * - `participants`: Array of usernames representing the chat participants.
 * - `name`: name of the community.
 * - `description`: description of the community.
 * - `visibility`: whether community is PUBLIC or PRIVATE
 * - `participants`: list of community participants
 * - `questions`: array of questions data associated with the community.
 */
export interface Community {
  name: string;
  description: string;
  visibility: string;
  participants: string[];
  admin: string;
  moderators?: string[];
  banned?: string[];
  muted?: string[];
}

/**
 * Represents a Database community without poplated fields
 * _id - Object Id of the community document
 * createdAt - created at date timestamp
 * updatedAt - updated at date timestamp
 */
export interface DatabaseCommunity extends Community {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type definition for a community request that contains communityId in params
 */
export interface CommunityIdRequest extends Request {
  params: {
    communityId: string;
  };
}

/**
 * Type definition for create community request
 */
export interface CreateCommunityRequest extends Request {
  body: {
    name: string;
    description: string;
    admin: string;
    visibility?: string;
    participants?: string[];
  };
}

/**
 * Type definition for join/leave community request
 */
export interface ToggleMembershipRequest extends Request {
  body: {
    communityId: string;
    username: string;
  };
}

export interface ToggleRequest extends Request {
  body: {
    communityId: string;
    managerUsername: string;
    username: string;
  };
}

/**
 * Type definition for delete community request
 */
export interface DeleteCommunityRequest extends CommunityIdRequest {
  body: {
    username: string;
  };
}

export interface CommunityAnnouncementRequest extends Request {
  body: {
    communityId: string;
    managerUsername: string;
    announcement: Notification;
  };
}

/**
 * Type for community operation responses
 * Either returns a DatabaseCommunity (successful operation) or an error message
 */
export type CommunityResponse = DatabaseCommunity | { error: string };

export type CommunityRole = 'participant' | 'moderator' | 'admin';
