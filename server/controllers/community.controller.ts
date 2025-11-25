import express, { Request, Response } from 'express';
import {
  FakeSOSocket,
  CommunityIdRequest,
  CreateCommunityRequest,
  ToggleMembershipRequest,
  DeleteCommunityRequest,
  ToggleRequest,
  CommunityAnnouncementRequest,
  AppealRequest,
  Appeal,
  CommunityDashboardRequest,
  DatabaseAppeal,
  AppealUpdateRequest,
} from '../types/types';
import {
  getCommunity,
  getAllCommunities,
  toggleCommunityMembership,
  createCommunity,
  deleteCommunity,
  toggleModerator,
  toggleBanUser,
  sendCommunityAnnouncement,
  sendNotificationUpdates,
  toggleMuteCommunityUser,
  addAppealToCommunity,
  respondToAppeal,
} from '../services/community.service';
import saveAppeal from '../services/appeal.service';
import mongoose from 'mongoose';
import CommunityModel from '../models/community.model';
import AppealModel from '../models/appeal.model';

/**
 * This controller handles community-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the community routes.
 * @throws {Error} Throws an error if the community operations fail.
 */
const communityController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Retrieves a community by its ID.
   *
   * @param req - The request object containing the communityId parameter
   * @param res - The response object used to send back the result
   * @returns {Promise<void>} - A promise that resolves when the response has been sent
   */
  const getCommunityRoute = async (req: CommunityIdRequest, res: Response): Promise<void> => {
    const { communityId } = req.params;

    try {
      const foundCommunity = await getCommunity(communityId);

      if ('error' in foundCommunity) {
        throw new Error(foundCommunity.error);
      }

      if (req.user?.username && foundCommunity.banned?.includes(req.user.username)) {
        res.status(403).send('Access denied');
        return;
      }
      res.json(foundCommunity);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving community: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves all communities.
   *
   * @param req - The express request object
   * @param res - The response object used to send back the result
   * @returns {Promise<void>} - A promise that resolves when the response has been sent
   */
  const getAllCommunitiesRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const communities = await getAllCommunities();

      if ('error' in communities) {
        throw new Error(communities.error);
      }

      const allowedCommunities = communities.filter(
        c => !req.user?.username || !c.banned || !c.banned?.includes(req.user.username),
      );

      res.json(allowedCommunities);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving communities: ${(err as Error).message}`);
    }
  };

  /**
   * Toggles a user's membership status in a community (join/leave).
   *
   * @param req - The request object containing communityId and username
   * @param res - The response object used to send back the result
   * @returns {Promise<void>} - A promise that resolves when the response has been sent
   */
  const toggleMembershipRoute = async (
    req: ToggleMembershipRequest,
    res: Response,
  ): Promise<void> => {
    const { communityId, username } = req.body;

    if (!communityId || !username) {
      res.status(400).json({ error: 'Missing communityId or username' });
      return;
    }

    try {
      const result = await toggleCommunityMembership(communityId, username);

      if ('error' in result) {
        if (result.error.includes('admins cannot leave')) {
          res.status(403).json({ error: result.error });
        } else if (result.error.includes('not found')) {
          res.status(404).json({ error: result.error });
        } else {
          res.status(500).json({ error: result.error });
        }
        return;
      }

      socket.emit('communityUpdate', {
        type: 'updated',
        community: result,
      });

      res.json(result);
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: `Error toggling community membership: ${(err as Error).message}` });
    }
  };

  /**
   * Creates a new community with the given details.
   *
   * @param req - The request object containing community details (name, description, admin, etc.)
   * @param res - The response object used to send back the result
   * @returns {Promise<void>} - A promise that resolves when the response has been sent
   */
  const createCommunityRoute = async (
    req: CreateCommunityRequest,
    res: Response,
  ): Promise<void> => {
    const { name, description, admin, visibility = 'PUBLIC', participants = [] } = req.body;

    const allParticipants = participants.includes(admin) ? participants : [...participants, admin];

    try {
      const savedCommunity = await createCommunity({
        name,
        description,
        admin,
        participants: allParticipants,
        visibility,
      });

      if ('error' in savedCommunity) {
        throw new Error(savedCommunity.error);
      }

      socket.emit('communityUpdate', {
        type: 'created',
        community: savedCommunity,
      });

      res.json(savedCommunity);
    } catch (err: unknown) {
      res.status(500).send(`Error creating a community: ${(err as Error).message}`);
    }
  };

  /**
   * Deletes a community if the requester is the admin.
   *
   * @param req - The request object containing communityId and username
   * @param res - The response object used to send back the result
   * @returns {Promise<void>} - A promise that resolves when the response has been sent
   */
  const deleteCommunityRoute = async (
    req: DeleteCommunityRequest,
    res: Response,
  ): Promise<void> => {
    const { communityId } = req.params;
    const { username } = req.body;
    try {
      const result = await deleteCommunity(communityId, username);

      if ('error' in result) {
        if (result.error.includes('Unauthorized')) {
          res.status(403).json({ error: result.error });
        } else if (result.error.includes('not found')) {
          res.status(404).json({ error: result.error });
        } else {
          res.status(500).json({ error: result.error });
        }
        return;
      }

      socket.emit('communityUpdate', {
        type: 'deleted',
        community: result,
      });

      res.json({ community: result, message: 'Community deleted successfully' });
    } catch (err: unknown) {
      res.status(500).json({ error: `Error deleting community: ${(err as Error).message}` });
    }
  };

  const toggleBanUserRoute = async (req: ToggleRequest, res: Response) => {
    const { communityId, managerUsername, username } = req.body;

    try {
      const result = await toggleBanUser(communityId, managerUsername, username, socket);

      if ('error' in result) {
        if (result.error.includes('admins or moderators cannot be banned')) {
          res.status(403).json({ error: result.error });
        } else if (result.error.includes('not found')) {
          res.status(404).json({ error: result.error });
        } else {
          res.status(500).json({ error: result.error });
        }
        return;
      }

      socket.emit('communityUpdate', { type: 'updated', community: result });
      res.json(result);
    } catch (err: unknown) {
      return res.status(500).json({ error: `Error banning user: ${(err as Error).message}` });
    }
  };

  const toggleModeratorRoute = async (req: ToggleRequest, res: Response) => {
    const { communityId, managerUsername, username } = req.body;

    try {
      const savedCommunity = await toggleModerator(communityId, managerUsername, username);

      if ('error' in savedCommunity) {
        if (savedCommunity.error.includes('Unauthorized')) {
          res.status(403).json({ error: savedCommunity.error });
        } else if (savedCommunity.error.includes('not found')) {
          res.status(404).json({ error: savedCommunity.error });
        } else {
          res.status(500).json({ error: savedCommunity.error });
        }
        return;
      }

      socket.emit('communityUpdate', {
        type: 'updated',
        community: savedCommunity,
      });

      res.json(savedCommunity);
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: `Error toggling moderator permissions: ${(err as Error).message}` });
    }
  };

  const sendCommunityAnnouncementRoute = async (
    req: CommunityAnnouncementRequest,
    res: Response,
  ) => {
    const { communityId, managerUsername, announcement } = req.body;
    try {
      const communityAnnouncement = await sendCommunityAnnouncement(
        communityId,
        managerUsername,
        announcement,
      );

      if (communityAnnouncement && 'error' in communityAnnouncement) {
        if (communityAnnouncement.error.includes('Unauthorized')) {
          res.status(403).json({ error: communityAnnouncement.error });
        } else if (communityAnnouncement.error.includes('not found')) {
          res.status(404).json({ error: communityAnnouncement.error });
        } else {
          res.status(500).json({ error: communityAnnouncement.error });
        }
        return;
      }

      const result = await sendNotificationUpdates(communityId, socket, communityAnnouncement);

      if (result && 'error' in result) {
        throw new Error(result.error);
      }

      res.json(communityAnnouncement);
    } catch (error) {
      res.status(500).json({ error: `Error sending community PSA: ${(error as Error).message}` });
    }
  };

  const toggleMuteCommunityUserRoute = async (req: ToggleRequest, res: Response) => {
    const { communityId, managerUsername, username } = req.body;

    try {
      const savedCommunity = await toggleMuteCommunityUser(
        communityId,
        managerUsername,
        username,
        socket,
      );

      if ('error' in savedCommunity) {
        if (savedCommunity.error.includes('Unauthorized')) {
          res.status(403).json({ error: savedCommunity.error });
        } else if (savedCommunity.error.includes('not found')) {
          res.status(404).json({ error: savedCommunity.error });
        } else {
          res.status(500).json({ error: savedCommunity.error });
        }
        return;
      }

      socket.emit('communityUpdate', {
        type: 'updated',
        community: savedCommunity,
      });
      res.json(savedCommunity);
    } catch (err) {
      res.status(500).json({ error: `Error toggling mute: ${(err as Error).message}` });
    }
  };

  const sendAppealRequestRoute = async (req: AppealRequest, res: Response) => {
    const appeal: Appeal = req.body;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const savedAppeal = await saveAppeal(appeal, session);
      if ('error' in savedAppeal) {
        throw new Error(savedAppeal.error);
      }

      const updatedCommunity = await addAppealToCommunity(savedAppeal, session, socket);
      if ('error' in updatedCommunity) {
        throw new Error(updatedCommunity.error);
      }

      await session.commitTransaction();

      socket.emit('commmunityUpdate', {
        community: updatedCommunity,
        type: 'updated',
      });

      res.status(200).json(savedAppeal);
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      res.status(500).json({
        error: `Error while submitting appeal: ${(error as Error).message}`,
      });
    } finally {
      await session.endSession();
    }
  };

  const getCommunityAppeals = async (req: CommunityDashboardRequest, res: Response) => {
    try {
      const { communityId } = req.params;
      const { managerUsername } = req.query;

      const community = await CommunityModel.findOne({ _id: communityId });

      if (!community) {
        throw new Error('Community not found');
      }

      if (
        !(community.admin === managerUsername) &&
        !community.moderators?.includes(managerUsername)
      ) {
        throw new Error('Unauthorized: User does not have permission to view dashboard');
      }

      const populatedAppeals: DatabaseAppeal[] = await Promise.all(
        community?.appeals?.map(async a => {
          const appeal = await AppealModel.findOne({ _id: a.toString() });

          if (!appeal) {
            throw new Error('Notification not found');
          }

          return appeal;
        }) ?? [],
      );

      res.json(populatedAppeals);
    } catch (error) {
      res.status(500).json({ error: `Error while getting appeals: ${(error as Error).message}` });
    }
  };

  const updateAppealRoute = async (req: AppealUpdateRequest, res: Response) => {
    const { communityId, appealId, status, managerUsername } = req.body;

    try {
      const result = await respondToAppeal(communityId, appealId, status, managerUsername, socket);

      if ('error' in result) {
        if (result.error.includes('Unauthorized')) {
          res.status(403).json({ error: result.error });
        } else if (result.error.includes('not found')) {
          res.status(404).json({ error: result.error });
        } else {
          res.status(500).json({ error: result.error });
        }
        return;
      }

      const populatedAppeals: DatabaseAppeal[] = await Promise.all(
        result?.appeals?.map(async a => {
          const appeal = await AppealModel.findOne({ _id: a.toString() });

          if (!appeal) {
            throw new Error('Notification not found');
          }

          return appeal;
        }) ?? [],
      );

      socket.emit('communityUpdate', {
        type: 'updated',
        community: result,
      });
      res.json({ ...result, appeals: populatedAppeals });
    } catch (err) {
      res.status(500).json({ error: `Error updating appeal: ${(err as Error).message}` });
    }
  };

  router.get('/getCommunity/:communityId', getCommunityRoute);
  router.get('/getAppeals/:communityId', getCommunityAppeals);
  router.get('/getAllCommunities', getAllCommunitiesRoute);
  router.post('/toggleMembership', toggleMembershipRoute);
  router.post('/toggleModerator', toggleModeratorRoute);
  router.post('/toggleBanUser', toggleBanUserRoute);
  router.post('/create', createCommunityRoute);
  router.post('/announcement', sendCommunityAnnouncementRoute);
  router.post('/toggleMute', toggleMuteCommunityUserRoute);
  router.post('/sendAppeal', sendAppealRequestRoute);
  router.patch('/updateAppeal', updateAppealRoute);
  router.delete('/delete/:communityId', deleteCommunityRoute);

  return router;
};

export default communityController;
