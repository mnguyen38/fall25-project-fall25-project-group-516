import { Notification, NotificationResponse } from '@fake-stack-overflow/shared/types/notification';
import CommunityModel from '../models/community.model';
import { Community, CommunityResponse, CommunityRole, DatabaseCommunity } from '../types/types';
import mongoose from 'mongoose';
import { addNotificationToUsers, saveNotification } from './notification.service';

/**
 * Retrieves a community by its ID.
 *
 * @param communityId - The ID of the community to retrieve
 * @returns A Promise resolving to the community document or an error object
 */
export const getCommunity = async (communityId: string): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }
    return community;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Retrieves all communities from the database.
 *
 * @returns A Promise resolving to an array of community documents or an error object
 */
export const getAllCommunities = async (): Promise<DatabaseCommunity[] | { error: string }> => {
  try {
    const communities = await CommunityModel.find({});
    return communities;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Toggles a user's membership status in a community.
 * If the user is already a participant, they will be removed.
 * If the user is not a participant, they will be added.
 *
 * @param communityId - The ID of the community to update
 * @param username - The username of the user whose membership to toggle
 * @returns A Promise resolving to the updated community document or an error object
 */
export const toggleCommunityMembership = async (
  communityId: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }

    // Check if user is the admin and trying to leave
    if (community.admin === username && community.participants.includes(username)) {
      return {
        error:
          'Community admins cannot leave their communities. Please transfer ownership or delete the community instead.',
      };
    }

    // Check if user is already a participant
    const isParticipant = community.participants.includes(username);

    let updatedCommunity: DatabaseCommunity | null;

    if (isParticipant) {
      // User is already a participant, so remove them
      updatedCommunity = await CommunityModel.findByIdAndUpdate(
        communityId,
        { $pull: { participants: username } },
        { new: true },
      );
    } else {
      // User is not a participant, so add them
      updatedCommunity = await CommunityModel.findByIdAndUpdate(
        communityId,
        { $addToSet: { participants: username } },
        { new: true },
      );
    }

    if (!updatedCommunity) {
      return { error: 'Failed to update community' };
    }

    return updatedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Creates a new community with the provided data.
 * The admin user is automatically added to the participants list if not already included.
 *
 * @param communityData - Object containing community details including name, description, visibility, admin, and participants
 * @returns A Promise resolving to the newly created community document or an error object
 */
export const createCommunity = async (communityData: Community): Promise<CommunityResponse> => {
  try {
    // Ensure admin is included in the participants list
    const newCommunity = new CommunityModel({
      ...communityData,
      admin: communityData.admin,
      participants: communityData.participants.includes(communityData.admin)
        ? communityData.participants
        : [...communityData.participants, communityData.admin],
      visibility: communityData.visibility || 'PUBLIC',
    });

    const savedCommunity = await newCommunity.save();

    return savedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Deletes a community by its ID if the requesting user is the admin.
 *
 * @param communityId - The ID of the community to delete
 * @param username - The username of the user requesting deletion
 * @returns A Promise resolving to a success object or an error object
 */
export const deleteCommunity = async (
  communityId: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    // First get the community to check admin status
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    // Check if the user is the admin
    if (community.admin !== username) {
      return { error: 'Unauthorized: Only the community admin can delete this community' };
    }

    // If user is admin, proceed with deletion
    const result = await CommunityModel.findByIdAndDelete(communityId);

    if (!result) {
      return { error: 'Community not found or already deleted' };
    }

    return result;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

export const toggleBanUser = async (communityId: string, username: string) => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    if (community.admin === username) {
      return {
        error:
          'Community admins or moderators cannot be banned. Please transfer ownership or delete the community instead.',
      };
    }

    if (!community.banned) {
      community.banned = [];
    }

    const isMember = community.participants.includes(username);
    const isModerator = community.moderators?.includes(username);
    const isBanned = community.banned?.includes(username);

    const communityUpdateOp = isBanned
      ? { $pull: { banned: username } }
      : !isMember
        ? { $addToSet: { banned: username } }
        : !isModerator
          ? { $addToSet: { banned: username }, $pull: { participants: username } }
          : {
              $addToSet: { banned: username },
              $pull: { participants: username, moderators: username },
            };

    const updatedCommunity = await CommunityModel.findByIdAndUpdate(
      communityId,
      communityUpdateOp,
      { new: true },
    );

    if (!updatedCommunity) {
      return { error: 'Failed to update community document' };
    }

    return updatedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

export const toggleModerator = async (
  communityId: string,
  adminUsername: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    if (community.admin !== adminUsername) {
      return { error: 'Unauthorized: Only the admin can change roles' };
    }

    const isMember = community.participants.includes(username);
    const isCurrentlyModerator = community.moderators?.includes(username);

    if (!isMember) {
      return { error: 'User is not a member of the community' };
    }

    const communityUpdateOp =
      isCurrentlyModerator && isMember
        ? { $pull: { moderators: username } }
        : { $addToSet: { moderators: username } };

    const updatedCommunity = await CommunityModel.findByIdAndUpdate(
      communityId,
      communityUpdateOp,
      { new: true },
    );

    if (!updatedCommunity) {
      return { error: 'Failed to update community document' };
    }

    return updatedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

export const getCommunityRole = async (
  communityId: string,
  username: string,
): Promise<CommunityRole | { error: string }> => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    if (!community.participants.includes(username)) {
      throw new Error('User is not a member of this community.');
    }

    if (community.admin === username) {
      return 'admin';
    } else if (community.moderators?.includes(username)) {
      return 'moderator';
    } else {
      return 'participant';
    }
  } catch (error) {
    return { error: (error as Error).message };
  }
};

export const sendCommunityAnnouncement = async (
  communityId: string,
  managerUsername: string,
  announcement: Notification,
): Promise<NotificationResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const community = await getCommunity(communityId);

    if ('error' in community) {
      throw new Error(community.error);
    }

    const isMod = community.moderators?.includes(managerUsername);
    const isAdmin = community.admin === managerUsername;

    if (!isMod && !isAdmin) {
      throw new Error('Unauthorized: User does not have proper permissions');
    }

    const receivers = community.participants;

    const notificationData: Notification = {
      ...announcement,
      receivers: receivers, // Ensure the list is populated here
      type: 'community', // Ensure type is set correctly
    };

    const savedNotification = await saveNotification(notificationData, session);

    if ('error' in savedNotification) {
      throw new Error(savedNotification.error);
    }

    const result = await addNotificationToUsers(savedNotification, session);

    if (result && 'error' in result) {
      throw new Error(result.error);
    }

    await session.commitTransaction();
    return savedNotification;
  } catch (error) {
    await session.abortTransaction();
    return { error: (error as Error).message };
  } finally {
    await session.endSession();
  }
};
