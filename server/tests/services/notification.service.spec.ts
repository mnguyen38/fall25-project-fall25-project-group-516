import { ObjectId } from 'mongodb';
import NotificationModel from '../../models/notifications.model';
import UserModel from '../../models/users.model';
import mongoose, { ClientSession } from 'mongoose';
import {
  saveNotification,
  addNotificationToUsers,
  sendNotification,
} from '../../services/notification.service';
import { Notification, DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';

jest.mock('../../models/notifications.model');
jest.mock('../../models/users.model');

describe('notification.service', () => {
  const mockNotification: Notification = {
    title: 'Test',
    msg: 'Test message',
    dateTime: new Date(),
    sender: 'user1',
    contextId: new ObjectId(),
    type: 'community',
  };

  const mockDbNotification: DatabaseNotification = {
    ...mockNotification,
    _id: new ObjectId(),
  };

  let mockSession: Partial<ClientSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as ClientSession);
  });

  describe('saveNotification', () => {
    it('should save notification with or without session', async () => {
      (NotificationModel.create as jest.Mock).mockResolvedValue([mockDbNotification]);

      const result1 = await saveNotification(mockNotification);
      expect(result1).toEqual(mockDbNotification);

      const result2 = await saveNotification(mockNotification, mockSession as ClientSession);
      expect(result2).toEqual(mockDbNotification);
    });

    it('should return error on failure', async () => {
      (NotificationModel.create as jest.Mock).mockRejectedValue(new Error('DB error'));
      const result = await saveNotification(mockNotification);
      expect('error' in result && result.error).toBe('DB error');
    });
  });

  describe('addNotificationToUsers', () => {
    it('should handle community, message, and other notification types', async () => {
      const updateResult = { modifiedCount: 1 };
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(updateResult),
      });

      // Test community type
      await addNotificationToUsers(['user1'], mockDbNotification, mockSession as ClientSession);
      expect(UserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ communityNotifs: true }),
        expect.any(Object),
      );

      // Test message type
      const msgNotif = { ...mockDbNotification, type: 'message' as const };
      await addNotificationToUsers(['user1'], msgNotif, mockSession as ClientSession);
      expect(UserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ messageNotifs: true }),
        expect.any(Object),
      );

      // Test other type
      const banNotif = { ...mockDbNotification, type: 'ban' as const };
      await addNotificationToUsers(['user1'], banNotif, mockSession as ClientSession);
      expect(UserModel.updateMany).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ messageNotifs: expect.anything() }),
        expect.any(Object),
      );
    });

    it('should manage internal session lifecycle', async () => {
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await addNotificationToUsers(['user1'], mockDbNotification);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should not manage external session lifecycle', async () => {
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await addNotificationToUsers(['user1'], mockDbNotification, mockSession as ClientSession);

      expect(mockSession.startTransaction).not.toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should return error for invalid notification fields', async () => {
      const tests = [
        { ...mockDbNotification, msg: undefined },
        { ...mockDbNotification, sender: undefined },
        { ...mockDbNotification, dateTime: undefined },
        { ...mockDbNotification, title: undefined },
      ];

      for (const invalidNotif of tests) {
        const result = await addNotificationToUsers(['user1'], invalidNotif as any);
        expect(result && 'error' in result && result.error).toBe('Invalid Notification');
      }
    });

    it('should return error when update fails or throws', async () => {
      // Update returns null
      (UserModel.updateMany as jest.Mock).mockReturnValueOnce({
        session: jest.fn().mockResolvedValue(null),
      });
      let result = await addNotificationToUsers(['user1'], mockDbNotification);
      expect(result && 'error' in result && result.error).toBe('Update failed');

      // Update throws error - internal session
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      result = await addNotificationToUsers(['user1'], mockDbNotification);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(result && 'error' in result && result.error).toBe('DB error');

      // Update throws error - external session
      jest.clearAllMocks();
      result = await addNotificationToUsers(
        ['user1'],
        mockDbNotification,
        mockSession as ClientSession,
      );
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      (NotificationModel.create as jest.Mock).mockResolvedValue([mockDbNotification]);
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await sendNotification(['user1'], mockNotification);

      expect(result).toEqual(mockDbNotification);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle saveNotification error', async () => {
      (NotificationModel.create as jest.Mock).mockRejectedValue(new Error('Save failed'));

      const result = await sendNotification(['user1'], mockNotification);

      expect('error' in result && result.error).toContain('1: Save failed');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should handle addNotificationToUsers error', async () => {
      (NotificationModel.create as jest.Mock).mockResolvedValue([mockDbNotification]);
      (UserModel.updateMany as jest.Mock).mockReturnValue({
        session: jest.fn().mockRejectedValue(new Error('Add failed')),
      });

      const result = await sendNotification(['user1'], mockNotification);

      expect('error' in result && result.error).toContain('2: Add failed');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });
});
