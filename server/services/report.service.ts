import ReportModel from '../models/report.model';
import CommunityModel from '../models/community.model';
import mongoose from 'mongoose';
import { Notification } from '@fake-stack-overflow/shared/types/notification';
import { sendNotification } from './notification.service';
import userSocketMap from '../utils/socketMap.util';
import { FakeSOSocket } from '../types/types';

/**
 * Creates a new report for a user within a community.
 *
 * @param communityId - ID of the community where the report occurred
 * @param reportedUser - Username of the user being reported
 * @param reporterUser - Username of the user making the report
 * @param reason - Detailed reason for the report
 * @param category - Category of the violation
 * @param socket - Socket instance for real-time notifications
 * @returns The created report or an error
 */
export const createReport = async (
  communityId: string,
  reportedUser: string,
  reporterUser: string,
  reason: string,
  category: string,
  socket: FakeSOSocket,
) => {
  try {
    // Prevent self-reporting
    if (reportedUser === reporterUser) {
      return { error: 'You cannot report yourself' };
    }

    // Check if community exists
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }

    // Check if both users are members of the community
    if (!community.participants.includes(reporterUser)) {
      return { error: 'You must be a member of this community to report users' };
    }

    if (!community.participants.includes(reportedUser)) {
      return { error: 'You can only report members of this community' };
    }

    // Check if this user has already reported this target in this community
    const existingReport = await ReportModel.findOne({
      communityId,
      reportedUser,
      reporterUser,
    });

    if (existingReport) {
      return { error: 'You have already reported this user in this community' };
    }

    // Create the report
    const report = await ReportModel.create({
      communityId,
      reportedUser,
      reporterUser,
      reason,
      category,
    });

    // Check if auto-ban threshold is met
    const banResult = await checkAndApplyAutoBan(communityId, reportedUser, socket);

    return { report, banApplied: banResult.banned };
  } catch (error) {
    return { error: `Error creating report: ${error}` };
  }
};

/**
 * Checks if a user has exceeded the report threshold in a community and applies automatic ban if needed.
 * Uses a sliding window of 7 days to count unique reporters within the community.
 * Sends notifications to the banned user and community moderators.
 *
 * @param communityId - ID of the community to check
 * @param reportedUsername - Username to check for auto-ban
 * @param socket - Socket instance for real-time notifications
 * @returns Object indicating if ban was applied and report count
 */
export const checkAndApplyAutoBan = async (
  communityId: string,
  reportedUsername: string,
  socket: FakeSOSocket,
) => {
  try {
    // Calculate cutoff date: 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get unique reporters in last 7 days within this community (excluding dismissed reports)
    const recentReports = await ReportModel.aggregate([
      {
        $match: {
          communityId: new mongoose.Types.ObjectId(communityId),
          reportedUser: reportedUsername,
          createdAt: { $gte: sevenDaysAgo },
          status: { $ne: 'dismissed' },
        },
      },
      {
        $group: {
          _id: '$reporterUser', // Group by reporter to get unique count
        },
      },
    ]);

    const uniqueReporterCount = recentReports.length;

    // Threshold: 5 unique reporters in 7 days
    if (uniqueReporterCount >= 5) {
      // Check if user is already banned in this community
      const community = await CommunityModel.findById(communityId);
      if (!community) {
        return { banned: false, error: 'Community not found' };
      }

      if (community.banned?.includes(reportedUsername)) {
        return { banned: false, reason: 'User is already banned in this community' };
      }

      // Prevent banning admins or moderators
      if (
        community.admin === reportedUsername ||
        community.moderators?.includes(reportedUsername)
      ) {
        return {
          banned: false,
          reason: 'Cannot auto-ban community admins or moderators',
        };
      }

      // Add user to community banned list and remove from participants/moderators
      await CommunityModel.findByIdAndUpdate(communityId, {
        $addToSet: { banned: reportedUsername },
        $pull: { participants: reportedUsername, moderators: reportedUsername },
      });

      // Send ban notification to the reported user (non-fatal if transactions fail)
      try {
        const userNotification: Notification = {
          title: `Auto-banned from ${community.name}`,
          msg: `You have been automatically banned from ${community.name} due to multiple user reports (${uniqueReporterCount} reports). You can submit an appeal to request reinstatement.`,
          dateTime: new Date(),
          sender: 'System',
          contextId: community._id,
          type: 'ban',
        };

        const userNotificationResult = await sendNotification([reportedUsername], userNotification);

        if (!('error' in userNotificationResult)) {
          const userSocketId = userSocketMap.get(reportedUsername);
          if (userSocketId) {
            socket.to(userSocketId).emit('notificationUpdate', {
              notificationStatus: { notification: userNotificationResult, read: false },
            });
          }
          // console.log(`[Auto-ban] Notification sent to ${reportedUsername}`);
        } else {
          // Notification failed (likely MongoDB transaction error in standalone mode)
          // console.error(
          //   `[Auto-ban] Failed to send notification to ${reportedUsername}: ${userNotificationResult.error}`,
          // );
        }
      } catch (err) {
        // console.error(`[Auto-ban] Error sending user notification: ${err}`);
      }

      // Send notification to moderators and admin about the auto-ban
      try {
        const moderatorRecipients = [community.admin, ...(community.moderators || [])];
        const modNotification: Notification = {
          title: `Auto-ban Applied in ${community.name}`,
          msg: `User "${reportedUsername}" has been automatically banned after receiving ${uniqueReporterCount} unique reports within 7 days.`,
          dateTime: new Date(),
          sender: 'System',
          contextId: community._id,
          type: 'report',
        };

        const modNotificationResult = await sendNotification(moderatorRecipients, modNotification);

        if (!('error' in modNotificationResult)) {
          moderatorRecipients.forEach(moderator => {
            const modSocketId = userSocketMap.get(moderator);
            if (modSocketId) {
              socket.to(modSocketId).emit('notificationUpdate', {
                notificationStatus: { notification: modNotificationResult, read: false },
              });
            }
          });
          // console.log(`[Auto-ban] Notification sent to ${moderatorRecipients.length} moderators`);
        } else {
          // console.error(
          //   `[Auto-ban] Failed to send notification to moderators: ${modNotificationResult.error}`,
          // );
        }
      } catch (err) {
        // console.error(`[Auto-ban] Error sending moderator notification: ${err}`);
      }

      return { banned: true, reportCount: uniqueReporterCount };
    }

    return { banned: false };
  } catch (error) {
    return { banned: false, error: `Error checking auto-ban: ${error}` };
  }
};

/**
 * Gets all reports for a specific user within a community.
 *
 * @param communityId - ID of the community
 * @param username - Username to get reports for
 * @returns Array of reports or an error
 */
export const getReportsByUser = async (communityId: string, username: string) => {
  try {
    const reports = await ReportModel.find({ communityId, reportedUser: username }).sort({
      createdAt: -1,
    });
    return reports;
  } catch (error) {
    return { error: `Error fetching reports: ${error}` };
  }
};

/**
 * Gets all pending reports for a community (moderator view).
 *
 * @param communityId - ID of the community
 * @returns Array of pending reports or an error
 */
export const getPendingReportsByCommunity = async (communityId: string) => {
  try {
    const reports = await ReportModel.find({ communityId, status: 'pending' }).sort({
      createdAt: -1,
    });
    return reports;
  } catch (error) {
    return { error: `Error fetching reports: ${error}` };
  }
};

/**
 * Updates the status of a report (moderator action).
 *
 * @param reportId - ID of the report to update
 * @param status - New status ('reviewed' or 'dismissed')
 * @param reviewedBy - Username of the moderator reviewing
 * @returns Updated report or an error
 */
export const updateReportStatus = async (
  reportId: string,
  status: 'reviewed' | 'dismissed',
  reviewedBy: string,
) => {
  try {
    const report = await ReportModel.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          reviewedBy,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!report) {
      return { error: 'Report not found' };
    }

    return report;
  } catch (error) {
    return { error: `Error updating report: ${error}` };
  }
};
