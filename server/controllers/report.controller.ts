import express, { Request, Response } from 'express';
import { FakeSOSocket } from '../types/types';
import {
  createReport,
  getReportsByUser,
  getPendingReportsByCommunity,
  updateReportStatus,
} from '../services/report.service';

interface CreateReportRequest extends Request {
  body: {
    communityId: string;
    reportedUser: string;
    reporterUser: string;
    reason: string;
    category: string;
  };
}

interface GetReportsRequest extends Request {
  body: {
    communityId: string;
    username: string;
  };
}

interface UpdateReportStatusRequest extends Request {
  body: {
    reportId: string;
    status: 'reviewed' | 'dismissed';
    reviewedBy: string;
  };
}

/**
 * This controller handles report-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the report routes.
 * @throws {Error} Throws an error if the report operations fail.
 */
const reportController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Creates a new report for a user within a community.
   * POST /report/create
   * Body: { communityId, reportedUser, reporterUser, reason, category }
   */
  const createReportRoute = async (req: CreateReportRequest, res: Response) => {
    const { communityId, reportedUser, reporterUser, reason, category } = req.body;

    try {
      const result = await createReport(
        communityId,
        reportedUser,
        reporterUser,
        reason,
        category,
        socket,
      );

      if ('error' in result && typeof result.error === 'string') {
        const errorMsg = result.error;
        if (errorMsg.includes('not found')) {
          res.status(404).json({ error: errorMsg });
        } else if (errorMsg.includes('cannot report yourself')) {
          res.status(400).json({ error: errorMsg });
        } else if (errorMsg.includes('already reported')) {
          res.status(409).json({ error: errorMsg });
        } else if (errorMsg.includes('must be a member')) {
          res.status(403).json({ error: errorMsg });
        } else {
          res.status(500).json({ error: errorMsg });
        }
        return;
      }

      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: `Error creating report: ${(err as Error).message}` });
    }
  };

  /**
   * Gets all reports for a specific user within a community.
   * POST /report/getByUser
   * Body: { communityId, username }
   */
  const getReportsByUserRoute = async (req: GetReportsRequest, res: Response) => {
    const { communityId, username } = req.body;

    try {
      const reports = await getReportsByUser(communityId, username);

      if ('error' in reports) {
        res.status(500).json({ error: reports.error });
        return;
      }

      res.json(reports);
    } catch (err: unknown) {
      res.status(500).json({ error: `Error fetching reports: ${(err as Error).message}` });
    }
  };

  /**
   * Gets all pending reports for a community (moderator view).
   * GET /report/pending/:communityId
   */
  const getPendingReportsRoute = async (req: Request, res: Response) => {
    const { communityId } = req.params;

    try {
      const reports = await getPendingReportsByCommunity(communityId);

      if ('error' in reports) {
        res.status(500).json({ error: reports.error });
        return;
      }

      res.json(reports);
    } catch (err: unknown) {
      res.status(500).json({ error: `Error fetching pending reports: ${(err as Error).message}` });
    }
  };

  /**
   * Updates the status of a report (moderator action).
   * POST /report/updateStatus
   * Body: { reportId, status, reviewedBy }
   */
  const updateReportStatusRoute = async (req: UpdateReportStatusRequest, res: Response) => {
    const { reportId, status, reviewedBy } = req.body;

    try {
      const report = await updateReportStatus(reportId, status, reviewedBy);

      if ('error' in report && typeof report.error === 'string') {
        const errorMsg = report.error;
        if (errorMsg.includes('not found')) {
          res.status(404).json({ error: errorMsg });
        } else {
          res.status(500).json({ error: errorMsg });
        }
        return;
      }

      res.json(report);
    } catch (err: unknown) {
      res.status(500).json({ error: `Error updating report status: ${(err as Error).message}` });
    }
  };

  // Routes
  router.post('/create', createReportRoute);
  router.post('/getByUser', getReportsByUserRoute);
  router.get('/pending/:communityId', getPendingReportsRoute);
  router.post('/updateStatus', updateReportStatusRoute);

  return router;
};

export default reportController;
