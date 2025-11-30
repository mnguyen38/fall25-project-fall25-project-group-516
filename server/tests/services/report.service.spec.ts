import mongoose from 'mongoose';
import ReportModel from '../../models/report.model';
import CommunityModel from '../../models/community.model';
import {
  createReport,
  checkAndApplyAutoBan,
  getReportsByUser,
  getPendingReportsByCommunity,
  updateReportStatus,
} from '../../services/report.service';
import * as notificationService from '../../services/notification.service';
import userSocketMap from '../../utils/socketMap.util';

// Mock the models
jest.mock('../../models/report.model');
jest.mock('../../models/community.model');
jest.mock('../../services/notification.service');

const mockSocket = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
} as any;

const mockCommunity = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Community',
  admin: 'admin123',
  participants: ['user1', 'user2', 'reporter1'],
  moderators: ['mod1'],
  banned: [],
};

describe('report.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userSocketMap.clear();
  });

  describe('createReport', () => {
    it('should return error if user tries to report themselves', async () => {
      const result = await createReport(
        'communityId',
        'user1',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result).toEqual({ error: 'You cannot report yourself' });
    });

    it('should return error if community does not exist', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await createReport(
        'communityId',
        'user2',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result).toEqual({ error: 'Community not found' });
    });

    it('should return error if reporter is not a member of the community', async () => {
      const community = { ...mockCommunity, participants: ['user2'] };
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);

      const result = await createReport(
        'communityId',
        'user2',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result).toEqual({ error: 'You must be a member of this community to report users' });
    });

    it('should return error if reported user is not a member of the community', async () => {
      const community = { ...mockCommunity, participants: ['user1'] };
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);

      const result = await createReport(
        'communityId',
        'user2',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result).toEqual({ error: 'You can only report members of this community' });
    });

    it('should return error if user has already reported this target', async () => {
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(mockCommunity);
      (ReportModel.findOne as jest.Mock).mockResolvedValueOnce({ _id: 'existingReport' });

      const result = await createReport(
        mockCommunity._id.toString(),
        'user2',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result).toEqual({
        error: 'You have already reported this user in this community',
      });
    });

    it('should successfully create a report when all validations pass', async () => {
      const mockReport = {
        _id: new mongoose.Types.ObjectId(),
        communityId: mockCommunity._id,
        reportedUser: 'user2',
        reporterUser: 'reporter1',
        reason: 'Spam content',
        category: 'spam',
      };

      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(mockCommunity);
      (ReportModel.findOne as jest.Mock).mockResolvedValueOnce(null); // No existing report
      (ReportModel.create as jest.Mock).mockResolvedValueOnce(mockReport);
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([]); // No auto-ban

      const result = await createReport(
        mockCommunity._id.toString(),
        'user2',
        'reporter1',
        'Spam content',
        'spam',
        mockSocket,
      );

      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('banApplied');
      expect(ReportModel.create).toHaveBeenCalledWith({
        communityId: mockCommunity._id.toString(),
        reportedUser: 'user2',
        reporterUser: 'reporter1',
        reason: 'Spam content',
        category: 'spam',
      });
    });

    it('should return error when database error occurs', async () => {
      (CommunityModel.findById as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await createReport(
        'communityId',
        'user2',
        'user1',
        'reason',
        'spam',
        mockSocket,
      );

      expect(result.error).toContain('Error creating report');
    });
  });

  describe('checkAndApplyAutoBan', () => {
    const communityId = new mongoose.Types.ObjectId().toString();

    it('should return banned:false when less than 5 unique reporters', async () => {
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
      ]);

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({ banned: false });
    });

    it('should return error if community not found when checking auto-ban', async () => {
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({ banned: false, error: 'Community not found' });
    });

    it('should return banned:false if user is already banned', async () => {
      const community = { ...mockCommunity, banned: ['user1'] };
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({
        banned: false,
        reason: 'User is already banned in this community',
      });
    });

    it('should return banned:false if reported user is an admin', async () => {
      const community = { ...mockCommunity };
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);

      const result = await checkAndApplyAutoBan(communityId, 'admin123', mockSocket);

      expect(result).toEqual({
        banned: false,
        reason: 'Cannot auto-ban community admins or moderators',
      });
    });

    it('should return banned:false if reported user is a moderator', async () => {
      const community = { ...mockCommunity };
      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);

      const result = await checkAndApplyAutoBan(communityId, 'mod1', mockSocket);

      expect(result).toEqual({
        banned: false,
        reason: 'Cannot auto-ban community admins or moderators',
      });
    });

    it('should apply auto-ban and send notifications when threshold is met', async () => {
      const community = { ...mockCommunity };
      const mockNotification = { _id: new mongoose.Types.ObjectId(), title: 'Auto-banned' };

      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(community);
      (notificationService.sendNotification as jest.Mock)
        .mockResolvedValueOnce(mockNotification) // User notification
        .mockResolvedValueOnce(mockNotification); // Moderator notification

      const userSocketId = 'socket-user1';
      userSocketMap.set('user1', userSocketId);

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({ banned: true, reportCount: 5 });
      expect(CommunityModel.findByIdAndUpdate).toHaveBeenCalledWith(communityId, {
        $addToSet: { banned: 'user1' },
        $pull: { participants: 'user1', moderators: 'user1' },
      });
      expect(notificationService.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockSocket.to).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      const community = { ...mockCommunity };

      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(community);
      (notificationService.sendNotification as jest.Mock)
        .mockResolvedValueOnce({ error: 'Notification failed' }) // User notification fails
        .mockResolvedValueOnce({ error: 'Notification failed' }); // Moderator notification fails

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({ banned: true, reportCount: 5 });
      // Ban still applied even if notifications fail
    });

    it('should send notifications to users with socket IDs', async () => {
      const community = { ...mockCommunity };
      const mockNotification = { _id: new mongoose.Types.ObjectId(), title: 'Auto-banned' };

      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(community);
      (notificationService.sendNotification as jest.Mock)
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(mockNotification);

      // Set up socket IDs for admin and moderator
      userSocketMap.set('admin123', 'socket-admin');
      userSocketMap.set('mod1', 'socket-mod');

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result).toEqual({ banned: true, reportCount: 5 });
      // Should emit notifications to admin and moderator
      expect(mockSocket.to).toHaveBeenCalledWith('socket-admin');
      expect(mockSocket.to).toHaveBeenCalledWith('socket-mod');
    });

    it('should handle notification sending exceptions', async () => {
      const community = { ...mockCommunity };

      (ReportModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'reporter1' },
        { _id: 'reporter2' },
        { _id: 'reporter3' },
        { _id: 'reporter4' },
        { _id: 'reporter5' },
      ]);
      (CommunityModel.findById as jest.Mock).mockResolvedValueOnce(community);
      (CommunityModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(community);
      (notificationService.sendNotification as jest.Mock).mockRejectedValueOnce(
        new Error('Socket error'),
      );

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      // Should still return success even if notification throws
      expect(result).toEqual({ banned: true, reportCount: 5 });
    });

    it('should return error when database error occurs during auto-ban check', async () => {
      (ReportModel.aggregate as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await checkAndApplyAutoBan(communityId, 'user1', mockSocket);

      expect(result.banned).toBe(false);
      expect(result.error).toContain('Error checking auto-ban');
    });
  });

  describe('getReportsByUser', () => {
    it('should return all reports for a user in a community', async () => {
      const mockReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          communityId: 'community1',
          reportedUser: 'user1',
          reporterUser: 'reporter1',
          reason: 'Spam',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          communityId: 'community1',
          reportedUser: 'user1',
          reporterUser: 'reporter2',
          reason: 'Harassment',
        },
      ];

      (ReportModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValueOnce(mockReports),
      });

      const result = await getReportsByUser('community1', 'user1');

      expect(result).toEqual(mockReports);
      expect(ReportModel.find).toHaveBeenCalledWith({
        communityId: 'community1',
        reportedUser: 'user1',
      });
    });

    it('should return error when database error occurs', async () => {
      (ReportModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValueOnce(new Error('DB Error')),
      });

      const result = await getReportsByUser('community1', 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error fetching reports');
      }
    });
  });

  describe('getPendingReportsByCommunity', () => {
    it('should return all pending reports for a community', async () => {
      const mockReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          communityId: 'community1',
          reportedUser: 'user1',
          status: 'pending',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          communityId: 'community1',
          reportedUser: 'user2',
          status: 'pending',
        },
      ];

      (ReportModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValueOnce(mockReports),
      });

      const result = await getPendingReportsByCommunity('community1');

      expect(result).toEqual(mockReports);
      expect(ReportModel.find).toHaveBeenCalledWith({
        communityId: 'community1',
        status: 'pending',
      });
    });

    it('should return error when database error occurs', async () => {
      (ReportModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValueOnce(new Error('DB Error')),
      });

      const result = await getPendingReportsByCommunity('community1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error fetching reports');
      }
    });
  });

  describe('updateReportStatus', () => {
    it('should successfully update report status', async () => {
      const mockReport = {
        _id: new mongoose.Types.ObjectId(),
        status: 'reviewed',
        reviewedBy: 'mod1',
        reviewedAt: new Date(),
      };

      (ReportModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(mockReport);

      const result = await updateReportStatus('reportId', 'reviewed', 'mod1');

      expect(result).toEqual(mockReport);
      expect(ReportModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'reportId',
        {
          $set: {
            status: 'reviewed',
            reviewedBy: 'mod1',
            reviewedAt: expect.any(Date),
          },
        },
        { new: true },
      );
    });

    it('should return error when report not found', async () => {
      (ReportModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateReportStatus('invalidId', 'reviewed', 'mod1');

      expect(result).toEqual({ error: 'Report not found' });
    });

    it('should return error when database error occurs', async () => {
      (ReportModel.findByIdAndUpdate as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await updateReportStatus('reportId', 'reviewed', 'mod1');

      expect(result.error).toContain('Error updating report');
    });
  });
});
