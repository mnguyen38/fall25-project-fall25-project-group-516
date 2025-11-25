import {
  DatabaseNotification,
  Notification,
  NotificationResponse,
} from '@fake-stack-overflow/shared/types/notification';
import CommunityModel from '../models/community.model';
import {
  Community,
  CommunityResponse,
  CommunityRole,
  DatabaseAppeal,
  DatabaseCommunity,
  FakeSOSocket,
} from '../types/types';
import mongoose, { ClientSession } from 'mongoose';
import { addNotificationToUsers, saveNotification, sendNotification } from './notification.service';
import UserModel from '../models/users.model';
import userSocketMap from '../utils/socketMap.util';
import AppealModel from '../models/appeal.model';

/**
 * Retrieves a community by its ID with premium member counts.
 *
 * @param communityId - The ID of the community to retrieve
 * @returns A Promise resolving to the community document with member counts or an error object
 */
export const getCommunity = async (communityId: string): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId).lean();
    if (!community) {
      return { error: 'Community not found' };
    }

    // Count premium and non-premium participants
    const premiumCount = await UserModel.countDocuments({
      username: { $in: community.participants },
      premiumProfile: true,
    });

    const nonPremiumCount = community.participants.length - premiumCount;

    return {
      ...community,
      premiumCount,
      nonPremiumCount,
    } as DatabaseCommunity & { premiumCount: number; nonPremiumCount: number };
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Retrieves all communities from the database with premium member counts.
 *
 * @returns A Promise resolving to an array of community documents with member counts or an error object
 */
export const getAllCommunities = async (): Promise<DatabaseCommunity[] | { error: string }> => {
  try {
    const communities = await CommunityModel.find({}).lean();

    // Add premium/non-premium counts for each community
    const communitiesWithCounts = await Promise.all(
      communities.map(async community => {
        const premiumCount = await UserModel.countDocuments({
          username: { $in: community.participants },
          premiumProfile: true,
        });

        const nonPremiumCount = community.participants.length - premiumCount;

        return {
          ...community,
          premiumCount,
          nonPremiumCount,
        };
      }),
    );

    return communitiesWithCounts as (DatabaseCommunity & {
      premiumCount: number;
      nonPremiumCount: number;
    })[];
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

    if (community.admin === username && community.participants.includes(username)) {
      return {
        error:
          'Community admins cannot leave their communities. Please transfer ownership or delete the community instead.',
      };
    }

    const isParticipant = community.participants.includes(username);

    let updatedCommunity: DatabaseCommunity | null;

    if (isParticipant) {
      updatedCommunity = await CommunityModel.findByIdAndUpdate(
        communityId,
        { $pull: { participants: username } },
        { new: true },
      );
    } else {
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
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    if (community.admin !== username) {
      return { error: 'Unauthorized: Only the community admin can delete this community' };
    }

    const result = await CommunityModel.findByIdAndDelete(communityId);

    if (!result) {
      return { error: 'Community not found or already deleted' };
    }

    return result;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

export const toggleBanUser = async (
  communityId: string,
  managerUsername: string,
  username: string,
  socket: FakeSOSocket,
) => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    const role = await getCommunityRole(communityId, managerUsername);

    if (role === 'participant') {
      throw new Error('Unauthorized: User does not have permission to ban');
    }

    if (community.admin === username) {
      return {
        error:
          'Community admins cannot be banned. Please transfer ownership or delete the community instead.',
      };
    }

    const isTargetModerator = community.moderators?.includes(username);

    if (role === 'moderator' && isTargetModerator) {
      return { error: 'Moderators cannot ban other moderators' };
    }

    if (!community.banned) {
      community.banned = [];
    }

    const isBanned = community.banned.includes(username);

    const communityUpdateOp = isBanned
      ? { $pull: { banned: username } }
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

    if (!isBanned) {
      const notification: Notification = {
        title: `Banned from ${updatedCommunity.name}`,
        msg: `You have been banned from the community ${updatedCommunity.name}.`,
        dateTime: new Date(),
        sender: managerUsername,
        contextId: updatedCommunity._id,
        type: 'ban',
      };
      const savedNotification = await sendNotification([username], notification);

      if (!('error' in savedNotification)) {
        const socketId = userSocketMap.get(username);
        if (socketId) {
          socket.to(socketId).emit('notificationUpdate', {
            notificationStatus: { notification: savedNotification, read: false },
          });
        }
      }
    }

    return updatedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

export const toggleModerator = async (
  communityId: string,
  managerUsername: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    if (community.admin !== managerUsername) {
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

    const notificationData: Notification = {
      ...announcement,
      type: 'community',
    };

    const savedNotification = await saveNotification(notificationData, session);

    if ('error' in savedNotification) {
      throw new Error(savedNotification.error);
    }

    const result = await addNotificationToUsers(community.participants, savedNotification, session);

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

export const sendNotificationUpdates = async (
  communityId: string,
  socket: FakeSOSocket,
  notification: DatabaseNotification,
): Promise<void | { error: string }> => {
  try {
    const community = await getCommunity(communityId);

    if ('error' in community) {
      throw new Error(community.error);
    }

    const recipients = await UserModel.find({
      username: { $in: community.participants },
      communityNotifs: true,
    });

    const socketIds = recipients
      .map(rec => userSocketMap.get(rec.username))
      .filter((id): id is string => id !== undefined);

    socketIds.forEach(socketId => {
      socket.to(socketId).emit('notificationUpdate', {
        notificationStatus: { notification, read: false },
      });
    });
  } catch (error) {
    return { error: (error as Error).message };
  }
};

export const toggleMuteCommunityUser = async (
  communityId: string,
  managerUsername: string,
  username: string,
  socket: FakeSOSocket,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    const hasPermission =
      community.admin === managerUsername || community.moderators?.includes(managerUsername);

    if (!hasPermission) {
      throw new Error('Unauthorized: User does not have proper permissions');
    }

    const isMuted = community.muted?.includes(username);

    const operation = isMuted ? { $pull: { muted: username } } : { $addToSet: { muted: username } };

    const updatedCommunity = await CommunityModel.findByIdAndUpdate(communityId, operation, {
      new: true,
    });

    if (!updatedCommunity) {
      throw new Error('Count not update muted users');
    }

    if (!isMuted) {
      const notification: Notification = {
        title: `Muted in ${updatedCommunity.name}`,
        msg: `You have been muted in the community ${updatedCommunity.name}.`,
        dateTime: new Date(),
        sender: managerUsername,
        contextId: updatedCommunity._id,
        type: 'mute',
      };
      const savedNotification = await sendNotification([username], notification);

      if (!('error' in savedNotification)) {
        const socketId = userSocketMap.get(username);
        if (socketId) {
          socket.to(socketId).emit('notificationUpdate', {
            notificationStatus: { notification: savedNotification, read: false },
          });
        }
      }
    }

    return updatedCommunity;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Checks if a user is allowed to post content in a specific community.
 * Enforces that the user must be a participant and not muted.
 *
 * @param communityId - The ID of the community
 * @param username - The username of the user
 * @returns {Promise<boolean>} - True if allowed, false otherwise
 */
export const isAllowedToPostInCommunity = async (
  communityId: string,
  username: string,
): Promise<boolean> => {
  try {
    if (!communityId) {
      return true;
    }

    const isAllowed = await CommunityModel.findOne({
      _id: communityId,
      participants: { $in: [username] },
      muted: { $nin: [username] },
      banned: { $nin: [username]}
    });

    if (!isAllowed) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const addAppealToCommunity = async (
  appeal: DatabaseAppeal,
  session: ClientSession,
  socket: FakeSOSocket,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findOneAndUpdate(
      { _id: appeal.community.toString() },
      {
        $addToSet: { appeals: appeal },
      },
      { new: true },
    ).session(session);

    if (!community) {
      throw new Error('Failed to add appeal to community');
    }

    const recipients = [community.admin, ...(community.moderators || [])];
    const uniqueRecipients = [...new Set(recipients)];

    const notification: Notification = {
      title: `New Appeal in ${community.name}`,
      msg: `User ${appeal.username} has submitted an appeal request.`,
      dateTime: new Date(),
      sender: appeal.username,
      contextId: community._id,
      type: 'appeal',
    };

    const savedNotification = await saveNotification(notification, session);
    if ('error' in savedNotification) {
      throw new Error(savedNotification.error);
    }

    await addNotificationToUsers(uniqueRecipients, savedNotification, session);

    uniqueRecipients.forEach(recipient => {
      const socketId = userSocketMap.get(recipient);
      if (socketId) {
        socket.to(socketId).emit('notificationUpdate', {
          notificationStatus: { notification: savedNotification, read: false },
        });
      }
    });

    return community;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Resolves a community appeal by either approving or denying it.
 *
 * @param communityId - The ID of the community
 * @param appealId - The ID of the appeal
 * @param status - The decision ('approve' or 'deny')
 * @param managerUsername - The username of the moderator/admin performing the action
 * @param socket - The socket instance for emitting notifications
 * @returns {Promise<CommunityResponse>} - The updated community or an error
 */
export const respondToAppeal = async (
  communityId: string,
  appealId: string,
  status: 'deny' | 'approve',
  managerUsername: string,
  socket: FakeSOSocket,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }

    const isMod = community.moderators?.includes(managerUsername);
    const isAdmin = community.admin === managerUsername;
    if (!isMod && !isAdmin) {
      return { error: 'Unauthorized: User does not have proper permissions' };
    }

    const appeal = await AppealModel.findOneAndDelete({ _id: appealId, community: communityId });
    if (!appeal) {
      return { error: 'Appeal not found or does not belong to this community' };
    }

    const updateOps = { $pull: { appeals: appealId } };

    if (status === 'approve') {
      (updateOps as { $pull: { appeals: string; banned: string; muted: string } }).$pull = {
        appeals: appealId,
        banned: appeal.username,
        muted: appeal.username,
      };
    }

    const updatedCommunity = await CommunityModel.findByIdAndUpdate(communityId, updateOps, {
      new: true,
    });

    if (!updatedCommunity) {
      return { error: 'Failed to update community' };
    }

    const notification: Notification = {
      title: `Appeal Decision: ${community.name}`,
      msg: `Your appeal in ${community.name} has been ${status}.`,
      dateTime: new Date(),
      sender: managerUsername,
      contextId: null,
      type: 'community',
    };

    const savedNotification = await sendNotification([appeal.username], notification);

    if (!('error' in savedNotification)) {
      const socketId = userSocketMap.get(appeal.username);
      if (socketId) {
        socket.to(socketId).emit('notificationUpdate', {
          notificationStatus: { notification: savedNotification, read: false },
        });
      }
    }

    return updatedCommunity;
  } catch (error) {
    return { error: (error as Error).message };
  }
};
