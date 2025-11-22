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
  const res = await api.post(`${REPORT_API_URL}/create`, reportData);

  if (res.status !== 200) {
    throw new Error('Error while creating report');
  }

  return res.data;
};

/**
 * Gets all reports for a specific user within a community.
 *
 * @param communityId - The ID of the community
 * @param username - The username of the reported user
 * @returns An array of reports for the user
 */
export const getReportsByUser = async (communityId: string, username: string) => {
  const res = await api.post(`${REPORT_API_URL}/getByUser`, {
    communityId,
    username,
  });

  if (res.status !== 200) {
    throw new Error('Error while fetching reports');
  }

  return res.data;
};

/**
 * Gets all pending reports for a community (moderator view).
 *
 * @param communityId - The ID of the community
 * @returns An array of pending reports
 */
export const getPendingReports = async (communityId: string) => {
  const res = await api.get(`${REPORT_API_URL}/pending/${communityId}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching pending reports');
  }

  return res.data;
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
  const res = await api.post(`${REPORT_API_URL}/updateStatus`, {
    reportId,
    status,
    reviewedBy,
  });

  if (res.status !== 200) {
    throw new Error('Error while updating report status');
  }

  return res.data;
};
