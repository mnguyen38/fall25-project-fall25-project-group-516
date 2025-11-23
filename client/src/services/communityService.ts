import { ObjectId } from 'mongodb';
import api from './config';
import { Community, DatabaseCommunity } from '../types/types';
import { DatabaseNotification, Notification } from '@fake-stack-overflow/shared/types/notification';

const COMMUNITIES_API_URL = `/api/community`;

/**
 * Adds or removes a user to a community.
 *
 * @param communityId - The ID of the community to join or leave.
 * @param username - The username of the user joining or leaving the community.
 * @returns The updated community object.
 */
const changeCommunityMembership = async (
  communityId: ObjectId,
  username: string,
): Promise<DatabaseCommunity> => {
  const res = await api.post(`${COMMUNITIES_API_URL}/toggleMembership`, {
    communityId,
    username,
  });

  if (res.status !== 200) {
    throw new Error('Error while changing community membership');
  }

  return res.data;
};

/**
 * Fetches all communities from the server.
 *
 * @returns An array of all communities.
 */
const getCommunities = async (): Promise<DatabaseCommunity[]> => {
  const res = await api.get(`${COMMUNITIES_API_URL}/getAllCommunities`);

  if (res.status !== 200) {
    throw new Error('Error while fetching communities');
  }

  return res.data;
};

/**
 * Creates a new community.
 * @param community - The community object to create.
 * @returns The created community object.
 */
const createCommunity = async (community: Community): Promise<DatabaseCommunity> => {
  const res = await api.post(`${COMMUNITIES_API_URL}/create`, community);

  if (res.status !== 200) {
    throw new Error('Error while creating community');
  }
  return res.data;
};

/**
 * Fetches a community by its ID.
 *
 * @param communityId - The ID of the community to fetch.
 * @returns The community object with the specified ID.
 */
const getCommunityById = async (communityId: string): Promise<DatabaseCommunity> => {
  const res = await api.get(`${COMMUNITIES_API_URL}/getCommunity/${communityId}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching community');
  }

  return res.data;
};

/**
 * Deletes a community by its ID.
 *
 * @param communityId - The ID of the community to delete.
 * @param username - The username of the user deleting the community.
 * @returns A promise that resolves when the community is deleted.
 */
const deleteCommunity = async (communityId: string, username: string): Promise<void> => {
  const res = await api.delete(`${COMMUNITIES_API_URL}/delete/${communityId}`, {
    data: { username },
  });

  if (res.status !== 200) {
    throw new Error('Error while deleting community');
  }

  return res.data;
};

const toggleModerator = async (
  communityId: string,
  adminUsername: string,
  username: string,
): Promise<DatabaseCommunity> => {
  const res = await api.post(`${COMMUNITIES_API_URL}/toggleModerator`, {
    communityId,
    adminUsername,
    username,
  });

  if (res.status !== 200) {
    throw new Error('Error while toggling moderator');
  }

  return res.data;
};

const toggleBan = async (communityId: string, username: string): Promise<DatabaseCommunity> => {
  const res = await api.post(`${COMMUNITIES_API_URL}/toggleBanUser`, { communityId, username });

  if (res.status !== 200) {
    throw new Error('Error while toggling ban');
  }
  return res.data;
};

const sendAnnouncement = async (
  communityId: string,
  managerUsername: string,
  announcement: Notification,
): Promise<DatabaseNotification> => {
  const data = { communityId, managerUsername, announcement };
  const res = await api.post(`${COMMUNITIES_API_URL}/announcement`, data);

  if (res.status !== 200) {
    throw new Error('Error when sending PSA');
  }

  return res.data;
};

export {
  changeCommunityMembership,
  getCommunities,
  createCommunity,
  getCommunityById,
  deleteCommunity,
  toggleModerator,
  toggleBan,
  sendAnnouncement,
};
