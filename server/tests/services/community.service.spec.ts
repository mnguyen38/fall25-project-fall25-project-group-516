import mongoose from 'mongoose';
import CommunityModel from '../../models/community.model';
import UserModel from '../../models/users.model';
import AppealModel from '../../models/appeal.model';
import {
  getCommunity,
  getAllCommunities,
  toggleCommunityMembership,
  createCommunity,
  deleteCommunity,
  toggleMuteCommunityUser,
  toggleBanUser,
  toggleModerator,
  getCommunityRole,
  sendCommunityAnnouncement,
  sendNotificationUpdates,
  isAllowedToPostInCommunity,
  addAppealToCommunity,
  respondToAppeal,
} from '../../services/community.service';
import { Community, DatabaseCommunity, FakeSOSocket } from '../../types/types';
import {
  sendNotification,
  saveNotification,
  addNotificationToUsers,
} from '../../services/notification.service';
import userSocketMap from '../../utils/socketMap.util';

jest.mock('../../models/community.model');
jest.mock('../../models/users.model');
jest.mock('../../models/appeal.model');
jest.mock('../../services/notification.service');

jest.mock('../../utils/socketMap.util', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('Community Service', () => {
  let mockSocket: FakeSOSocket;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as FakeSOSocket;

    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

    // Default countDocuments to 0 to prevent getCommunity crashes on calculation
    (UserModel.countDocuments as jest.Mock).mockResolvedValue(0);
  });

  const mockCommunityId = '65e9b58910afe6e94fc6e6dc';
  const mockCommunity: DatabaseCommunity = {
    _id: new mongoose.Types.ObjectId(mockCommunityId),
    name: 'Test Community',
    description: 'Test Description',
    admin: 'admin_user',
    participants: ['admin_user', 'user1', 'user2', 'mod_user'],
    moderators: ['mod_user'],
    muted: [],
    banned: [],
    visibility: 'PUBLIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    appeals: [],
  };

  describe('getCommunity', () => {
    test('should return community with premium counts if found', async () => {
      // Mock findById to return an object with a lean() function
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });

      // Mock countDocuments for premium calculation
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await getCommunity(mockCommunityId);

      expect(result).toEqual({
        ...mockCommunity,
        premiumCount: 1,
        nonPremiumCount: mockCommunity.participants.length - 1,
      });
    });

    test('should return error if not found', async () => {
      // Mock findById -> lean() -> null
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await getCommunity(mockCommunityId);
      expect(result).toEqual({ error: 'Community not found' });
    });

    test('should return error on exception', async () => {
      // Mock findById -> lean() -> rejection
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB Error')),
      });

      const result = await getCommunity(mockCommunityId);

      expect(result).toEqual({ error: 'DB Error' });
    });
  });

  describe('getAllCommunities', () => {
    test('should return all communities with counts', async () => {
      // Mock find -> lean() -> [community]
      (CommunityModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockCommunity]),
      });

      (UserModel.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await getAllCommunities();

      const expected = [
        {
          ...mockCommunity,
          premiumCount: 0,
          nonPremiumCount: mockCommunity.participants.length,
        },
      ];

      expect(result).toEqual(expected);
    });

    test('should return error on exception', async () => {
      (CommunityModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB Error')),
      });
      const result = await getAllCommunities();
      expect(result).toEqual({ error: 'DB Error' });
    });
  });

  describe('toggleCommunityMembership', () => {
    // This function uses simple findById (no lean) based on provided implementation
    test('should throw error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await toggleCommunityMembership(mockCommunityId, 'new_user');
      expect('error' in result).toBe(true);
    });
    test('should add user if not participant', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleCommunityMembership(mockCommunityId, 'new_user');

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $addToSet: { participants: 'new_user' } },
        { new: true },
      );
    });

    test('should remove user if participant', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleCommunityMembership(mockCommunityId, 'user1');

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { participants: 'user1' } },
        { new: true },
      );
    });

    test('should error if admin tries to leave', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleCommunityMembership(mockCommunityId, 'admin_user');
      expect(result).toEqual({ error: expect.stringContaining('admins cannot leave') });
    });

    test('should return error if update returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      const result = await toggleCommunityMembership(mockCommunityId, 'user1');
      expect(result).toEqual({ error: 'Failed to update community' });
    });

    test('should handle exceptions', async () => {
      (CommunityModel.findById as jest.Mock).mockRejectedValue(new Error('Err'));
      const result = await toggleCommunityMembership(mockCommunityId, 'user1');
      expect(result).toEqual({ error: 'Err' });
    });
  });

  describe('createCommunity', () => {
    const input: Community = {
      name: 'New',
      description: 'Desc',
      admin: 'admin',
      participants: [],
      visibility: 'PUBLIC',
    };

    test('should save new community', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockCommunity);
      (CommunityModel as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await createCommunity(input);
      expect(result).toEqual(mockCommunity);
    });

    test('should handle save errors', async () => {
      (CommunityModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Save Fail')),
      }));
      const result = await createCommunity(input);
      expect(result).toEqual({ error: 'Save Fail' });
    });

    test('should not duplicate admin in participants if already present', async () => {
      const inputWithAdmin: Community = {
        ...input,
        participants: ['admin'],
      };

      const mockSave = jest.fn().mockResolvedValue(mockCommunity);
      (CommunityModel as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
      }));

      await createCommunity(inputWithAdmin);

      expect(CommunityModel).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: ['admin'],
        }),
      );
    });

    test('should default visibility to PUBLIC if not provided', async () => {
      const inputNoVis: Partial<Community> = { ...input, visibility: undefined };

      const mockSave = jest.fn().mockResolvedValue(mockCommunity);
      (CommunityModel as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
      }));

      await createCommunity(inputNoVis as Community);

      expect(CommunityModel).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'PUBLIC',
        }),
      );
    });
  });

  describe('deleteCommunity', () => {
    test('should throw error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await deleteCommunity(mockCommunityId, 'admin_user');
      expect('error' in result).toBe(true);
    });
    test('should delete if admin', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await deleteCommunity(mockCommunityId, 'admin_user');
      expect(result).toEqual(mockCommunity);
    });

    test('should error if not admin', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await deleteCommunity(mockCommunityId, 'user1');
      expect(result).toEqual({ error: expect.stringContaining('Unauthorized') });
    });

    test('should error if delete returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
      const result = await deleteCommunity(mockCommunityId, 'admin_user');
      expect(result).toEqual({ error: expect.stringContaining('already deleted') });
    });

    test('should handle exceptions', async () => {
      (CommunityModel.findById as jest.Mock).mockRejectedValue(new Error('Err'));
      const result = await deleteCommunity(mockCommunityId, 'admin_user');
      expect(result).toEqual({ error: 'Err' });
    });
  });

  describe('toggleBanUser', () => {
    test('should throw error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await toggleBanUser(mockCommunityId, 'user1', 'user2', mockSocket);
      expect('error' in result).toBe(true);
    });
    test('should error if user is only participant (not mod/admin)', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);

      const result = await toggleBanUser(mockCommunityId, 'user1', 'user2', mockSocket);
      expect(result).toEqual({ error: 'Unauthorized: User does not have permission to ban' });
    });

    test('should error if target is admin', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleBanUser(mockCommunityId, 'mod_user', 'admin_user', mockSocket);
      expect(result).toEqual({ error: expect.stringContaining('admins cannot be banned') });
    });

    test('should error if moderator tries to ban another moderator', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleBanUser(mockCommunityId, 'mod_user', 'mod_user', mockSocket);
      expect(result).toEqual({ error: 'Moderators cannot ban other moderators' });
    });

    test('should ban user, notify, and emit socket if not banned', async () => {
      const comm = { ...mockCommunity, banned: [] };
      const updatedComm = { ...mockCommunity, banned: ['user1'] };

      (CommunityModel.findById as jest.Mock).mockResolvedValue(comm);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedComm);
      (sendNotification as jest.Mock).mockResolvedValue({ _id: 'n1' });
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue('s1');

      const result = await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        {
          $addToSet: { banned: 'user1' },
          $pull: { participants: 'user1', moderators: 'user1' },
        },
        { new: true },
      );
      expect(sendNotification).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalledWith('s1');
      expect(result).toEqual(updatedComm);
    });

    test('should unban user (no notification) if already banned', async () => {
      const comm = { ...mockCommunity, banned: ['user1'] };
      const updatedComm = { ...mockCommunity, banned: [] };

      (CommunityModel.findById as jest.Mock).mockResolvedValue(comm);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedComm);

      const result = await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { banned: 'user1' } },
        { new: true },
      );
      expect(sendNotification).not.toHaveBeenCalled();
      expect(result).toEqual(updatedComm);
    });

    test('should initialize banned array if undefined', async () => {
      const commNoBanned = { ...mockCommunity, banned: undefined };
      (CommunityModel.findById as jest.Mock).mockResolvedValue(commNoBanned);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    test('should return error if update returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);
      expect(result).toEqual({ error: 'Failed to update community document' });
    });

    test('should not emit socket if notification fails', async () => {
      const comm = { ...mockCommunity, banned: [] };
      const updatedComm = { ...mockCommunity, banned: ['user1'] };
      (CommunityModel.findById as jest.Mock).mockResolvedValue(comm);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedComm);

      (sendNotification as jest.Mock).mockResolvedValue({ error: 'Mail down' });

      await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(sendNotification).toHaveBeenCalled();
      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    test('should not emit socket if user is offline (socketId undefined)', async () => {
      const comm = { ...mockCommunity, banned: [] };
      const updatedComm = { ...mockCommunity, banned: ['user1'] };
      (CommunityModel.findById as jest.Mock).mockResolvedValue(comm);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedComm);
      (sendNotification as jest.Mock).mockResolvedValue({ _id: 'n1' });

      (userSocketMap.get as unknown as jest.Mock).mockReturnValue(undefined);

      await toggleBanUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('toggleModerator', () => {
    test('should error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await toggleModerator(mockCommunityId, 'mod_user', 'user1');
      expect(result).toEqual({ error: expect.stringContaining('Community not found') });
    });
    test('should return error if update returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await toggleModerator(mockCommunityId, 'admin_user', 'user1');
      expect(result).toEqual({ error: 'Failed to update community document' });
    });
    test('should error if not admin', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleModerator(mockCommunityId, 'mod_user', 'user1');
      expect(result).toEqual({ error: expect.stringContaining('Only the admin') });
    });

    test('should error if target not member', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleModerator(mockCommunityId, 'admin_user', 'outsider');
      expect(result).toEqual({ error: 'User is not a member of the community' });
    });

    test('should add moderator', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleModerator(mockCommunityId, 'admin_user', 'user1');

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $addToSet: { moderators: 'user1' } },
        { new: true },
      );
    });

    test('should remove moderator', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleModerator(mockCommunityId, 'admin_user', 'mod_user');

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { moderators: 'mod_user' } },
        { new: true },
      );
    });
  });

  describe('getCommunityRole', () => {
    test('should return admin', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await getCommunityRole(mockCommunityId, 'admin_user');
      expect(result).toBe('admin');
    });

    test('should return moderator', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await getCommunityRole(mockCommunityId, 'mod_user');
      expect(result).toBe('moderator');
    });

    test('should return participant', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await getCommunityRole(mockCommunityId, 'user1');
      expect(result).toBe('participant');
    });

    test('should error if user not member', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await getCommunityRole(mockCommunityId, 'outsider');
      expect(result).toEqual({ error: 'User is not a member of this community.' });
    });
    test('should return error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await getCommunityRole(mockCommunityId, 'admin_user');
      expect(result).toEqual({ error: 'Community not found' });
    });
  });

  describe('sendCommunityAnnouncement', () => {
    const announcement = { title: 'T', msg: 'M', sender: 'admin_user' } as any;

    test('should succeed for admin', async () => {
      // Must mock using lean() because sendCommunityAnnouncement calls getCommunity()
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({ _id: 'n1' });
      (addNotificationToUsers as jest.Mock).mockResolvedValue({});

      const result = await sendCommunityAnnouncement(mockCommunityId, 'admin_user', announcement);

      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'n1' });
    });

    test('should error if unauthorized', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });
      const result = await sendCommunityAnnouncement(mockCommunityId, 'user1', announcement);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(result).toEqual({ error: expect.stringContaining('Unauthorized') });
    });

    test('should abort if saveNotification fails', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({ error: 'Save Error' });

      const result = await sendCommunityAnnouncement(mockCommunityId, 'admin_user', announcement);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(result).toEqual({ error: 'Save Error' });
    });

    test('should return error if community lookup fails', async () => {
      // Mock findById -> lean() -> null
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await sendCommunityAnnouncement(mockCommunityId, 'admin_user', {} as any);

      expect(result).toEqual({ error: 'Community not found' });
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should abort if addNotificationToUsers fails', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({ _id: 'n1' });

      (addNotificationToUsers as jest.Mock).mockResolvedValue({ error: 'Partial fail' });

      const result = await sendCommunityAnnouncement(mockCommunityId, 'admin_user', {} as any);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(result).toEqual({ error: 'Partial fail' });
    });
  });

  describe('sendNotificationUpdates', () => {
    test('should emit to filtered users', async () => {
      // Must mock using lean() structure
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });

      (UserModel.find as jest.Mock).mockResolvedValue([{ username: 'user1' }]);
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue('s1');

      await sendNotificationUpdates(mockCommunityId, mockSocket, { _id: 'n1' } as any);

      expect(mockSocket.to).toHaveBeenCalledWith('s1');
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    test('should return error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      const result = await sendNotificationUpdates(mockCommunityId, mockSocket, {} as any);
      expect(result).toEqual({ error: 'Community not found' });
    });

    test('should return error on exception', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Crash')),
      });
      const result = await sendNotificationUpdates(mockCommunityId, mockSocket, {} as any);
      expect(result).toEqual({ error: 'Crash' });
    });

    test('should skip users without socket connections', async () => {
      (CommunityModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCommunity),
      });

      (UserModel.find as jest.Mock).mockResolvedValue([
        { username: 'user1' },
        { username: 'user2' },
      ]);

      (userSocketMap.get as unknown as jest.Mock).mockImplementation(u =>
        u === 'user1' ? 's1' : undefined,
      );

      await sendNotificationUpdates(mockCommunityId, mockSocket, { _id: 'n1' } as any);

      expect(mockSocket.to).toHaveBeenCalledTimes(1);
      expect(mockSocket.to).toHaveBeenCalledWith('s1');
    });
  });

  describe('toggleMuteCommunityUser', () => {
    test('should error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await toggleMuteCommunityUser(
        mockCommunityId,
        'admin_user',
        'user1',
        mockSocket,
      );
      expect(result).toEqual({ error: expect.stringContaining('Community not found') });
    });
    test('should error if unauthorized', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await toggleMuteCommunityUser(
        mockCommunityId,
        'minion1',
        'minon2',
        mockSocket,
      );
      expect(result).toEqual({
        error: expect.stringContaining('Unauthorized: User does not have proper permissions'),
      });
    });
    test('should unmute without notification', async () => {
      const mutedComm = { ...mockCommunity, muted: ['user1'] };
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mutedComm);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await toggleMuteCommunityUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(sendNotification).not.toHaveBeenCalled();
      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { muted: 'user1' } },
        { new: true },
      );
    });

    test('should mute and notify', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const mutedResult = { ...mockCommunity, muted: ['user1'] };
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mutedResult);
      (sendNotification as jest.Mock).mockResolvedValue({});
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue('s1');

      await toggleMuteCommunityUser(mockCommunityId, 'admin_user', 'user1', mockSocket);

      expect(sendNotification).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    test('should fail if update returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      const result = await toggleMuteCommunityUser(
        mockCommunityId,
        'admin_user',
        'user1',
        mockSocket,
      );
      expect(result).toEqual({ error: expect.stringContaining('Count not update') });
    });
  });

  describe('isAllowedToPostInCommunity', () => {
    // This function uses findOne, not findById, and no lean()
    test('should allow if no communityId', async () => {
      const result = await isAllowedToPostInCommunity('', 'user1');
      expect(result).toBe(true);
    });

    test('should allow if findOne returns document', async () => {
      (CommunityModel.findOne as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await isAllowedToPostInCommunity(mockCommunityId, 'user1');
      expect(result).toBe(true);
    });

    test('should deny if findOne returns null', async () => {
      (CommunityModel.findOne as jest.Mock).mockResolvedValue(null);
      const result = await isAllowedToPostInCommunity(mockCommunityId, 'user1');
      expect(result).toBe(false);
    });

    test('should deny on error', async () => {
      (CommunityModel.findOne as jest.Mock).mockRejectedValue(new Error('Err'));
      const result = await isAllowedToPostInCommunity(mockCommunityId, 'user1');
      expect(result).toBe(false);
    });
  });

  describe('addAppealToCommunity', () => {
    const appeal = { _id: 'a1', community: mockCommunityId, username: 'banned_user' } as any;

    test('should add appeal and notify admins/mods', async () => {
      (CommunityModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({ _id: 'n1' });

      const result = await addAppealToCommunity(appeal, mockSession, mockSocket);

      expect(addNotificationToUsers).toHaveBeenCalled();
      expect(result).toEqual(mockCommunity);
    });

    test('should error if update fails', async () => {
      (CommunityModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      const result = await addAppealToCommunity(appeal, mockSession, mockSocket);
      expect(result).toEqual({ error: 'Failed to add appeal to community' });
    });
    test('should error if saveNotification fails', async () => {
      (CommunityModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({ error: 'Save Fail' });

      const result = await addAppealToCommunity(
        { _id: 'a1', community: mockCommunityId, username: 'u1' } as any,
        mockSession,
        mockSocket,
      );
      expect(result).toEqual({ error: 'Save Fail' });
    });

    test('should handle exceptions', async () => {
      (CommunityModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        session: jest.fn().mockRejectedValue(new Error('DB Fail')),
      });
      const result = await addAppealToCommunity(
        { _id: 'a1', community: mockCommunityId } as any,
        mockSession,
        mockSocket,
      );
      expect(result).toEqual({ error: 'DB Fail' });
    });

    test('should skip socket emit if user offline', async () => {
      (CommunityModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(mockCommunity),
      });
      (saveNotification as jest.Mock).mockResolvedValue({});
      (addNotificationToUsers as jest.Mock).mockResolvedValue({});
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue(undefined);

      await addAppealToCommunity(
        { _id: 'a1', community: mockCommunityId, username: 'u1' } as any,
        mockSession,
        mockSocket,
      );
      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('respondToAppeal', () => {
    const appeal = { _id: 'a1', community: mockCommunityId, username: 'user1' } as any;

    test('should error if unauthorized', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      const result = await respondToAppeal(mockCommunityId, 'a1', 'approve', 'user1', mockSocket);
      expect(result).toEqual({ error: expect.stringContaining('Unauthorized') });
    });

    test('should error if appeal not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await respondToAppeal(
        mockCommunityId,
        'a1',
        'approve',
        'admin_user',
        mockSocket,
      );
      expect(result).toEqual({ error: expect.stringContaining('Appeal not found') });
    });

    test('should APPROVE: remove appeal, ban, mute, and notify', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue(appeal);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);
      (sendNotification as jest.Mock).mockResolvedValue({});
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue('s1');

      await respondToAppeal(mockCommunityId, 'a1', 'approve', 'admin_user', mockSocket);

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { appeals: 'a1', banned: 'user1', muted: 'user1' } },
        { new: true },
      );

      expect(sendNotification).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    test('should DENY: remove appeal only', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue(appeal);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);

      await respondToAppeal(mockCommunityId, 'a1', 'deny', 'admin_user', mockSocket);

      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCommunityId,
        { $pull: { appeals: 'a1' } },
        { new: true },
      );
    });

    test('should return error if community not found', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await respondToAppeal(mockCommunityId, 'a1', 'approve', 'admin', mockSocket);
      expect(result).toEqual({ error: 'Community not found' });
    });

    test('should return error if update returns null', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: 'a1', username: 'u1' });
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await respondToAppeal(
        mockCommunityId,
        'a1',
        'approve',
        'admin_user',
        mockSocket,
      );
      expect(result).toEqual({ error: 'Failed to update community' });
    });

    test('should not emit socket if notification fails', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: 'a1', username: 'u1' });
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);
      (sendNotification as jest.Mock).mockResolvedValue({ error: 'Fail' });

      await respondToAppeal(mockCommunityId, 'a1', 'approve', 'admin_user', mockSocket);
      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    test('should not emit socket if user offline', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValue(mockCommunity);
      (AppealModel.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: 'a1', username: 'u1' });
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCommunity);
      (sendNotification as jest.Mock).mockResolvedValue({});
      (userSocketMap.get as unknown as jest.Mock).mockReturnValue(undefined);

      await respondToAppeal(mockCommunityId, 'a1', 'approve', 'admin_user', mockSocket);
      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });
});
