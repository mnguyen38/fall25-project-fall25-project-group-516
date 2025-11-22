import api from './config';

const REPORT_API_URL = `/api/report`;

export interface CreateReportRequest {
  communityId: string;
  reportedUser: string;
  reporterUser: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'misleading' | 'other';
}

export interface CreateReportResponse {
  _id: string;
  communityId: string;
  reportedUser: string;
  reporterUser: string;
  reason: string;
  category: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
  banApplied?: boolean;
}

/**
 * Creates a new report for a user within a community.
 *
 * @param reportData - The report data containing all required fields
 * @returns The created report object
 */
export const createReport = async (
  reportData: CreateReportRequest,
): Promise<CreateReportResponse> => {
  try {
    const res = await api.post(`${REPORT_API_URL}/create`, reportData);
    return res.data;
  } catch (error: unknown) {
    // Extract user-friendly error message from server response
    const serverMessage = (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error;

    if (serverMessage) {
      // Make error messages more user-friendly
      if (serverMessage.includes('already reported')) {
        throw new Error(
          'We have already received your report for this user. Thank you for helping keep our community safe!',
        );
      } else if (serverMessage.includes('cannot report yourself')) {
        throw new Error('You cannot report yourself.');
      } else if (serverMessage.includes('not found')) {
        throw new Error('The community or user could not be found.');
      } else if (serverMessage.includes('must be a member')) {
        throw new Error('You must be a member of this community to submit reports.');
      } else {
        // Use the server's error message if it's descriptive
        throw new Error(serverMessage);
      }
    }

    // Fallback to generic error
    throw new Error('Unable to submit report. Please try again later.');
  }
};

/**
 * Gets all reports for a specific user within a community.
 *
 * @param communityId - The ID of the community
 * @param username - The username of the reported user
 * @returns An array of reports for the user
 */
export const getReportsByUser = async (communityId: string, username: string) => {
  try {
    const res = await api.post(`${REPORT_API_URL}/getByUser`, {
      communityId,
      username,
    });
    return res.data;
  } catch (error: unknown) {
    const serverMessage = (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error;
    throw new Error(serverMessage || 'Unable to fetch reports. Please try again later.');
  }
};

/**
 * Gets all pending reports for a community (moderator view).
 *
 * @param communityId - The ID of the community
 * @returns An array of pending reports
 */
export const getPendingReports = async (communityId: string) => {
  try {
    const res = await api.get(`${REPORT_API_URL}/pending/${communityId}`);
    return res.data;
  } catch (error: unknown) {
    const serverMessage = (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error;
    throw new Error(serverMessage || 'Unable to fetch pending reports. Please try again later.');
  }
};

/**
 * Updates the status of a report (moderator action).
 *
 * @param reportId - The ID of the report
 * @param status - The new status ('reviewed' or 'dismissed')
 * @param reviewedBy - The username of the moderator reviewing the report
 * @returns The updated report object
 */
export const updateReportStatus = async (
  reportId: string,
  status: 'reviewed' | 'dismissed',
  reviewedBy: string,
) => {
  try {
    const res = await api.post(`${REPORT_API_URL}/updateStatus`, {
      reportId,
      status,
      reviewedBy,
    });
    return res.data;
  } catch (error: unknown) {
    const serverMessage = (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error;

    if (serverMessage?.includes('not found')) {
      throw new Error('Report not found.');
    }

    throw new Error(serverMessage || 'Unable to update report status. Please try again later.');
  }
};
