import supertest from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import * as reportService from '../../services/report.service';
import { setupMockAuth } from '../../utils/mocks.util';

jest.mock('../../middleware/token.middleware');
jest.mock('../../services/report.service');

describe('report.controller', () => {
  beforeEach(() => {
    setupMockAuth();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  const mockReport = {
    _id: new mongoose.Types.ObjectId(),
    communityId: new mongoose.Types.ObjectId(),
    reportedUser: 'user1',
    reporterUser: 'user2',
    reason: 'Spam',
    category: 'spam',
    status: 'pending',
    createdAt: new Date(),
  };

  describe('POST /api/report/create', () => {
    const createBody = {
      communityId: 'comm1',
      reportedUser: 'user1',
      reporterUser: 'user2',
      reason: 'Spam',
      category: 'spam',
    };

    it('should create report successfully', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(200);
      expect(res.body.reason).toBe('Spam');
    });

    it('should return 404 when community/user not found', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue({
        error: 'Community not found',
      });

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(404);
    });

    it('should return 400 when user tries to report themselves', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue({
        error: 'You cannot report yourself',
      });

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(400);
    });

    it('should return 409 when user already reported', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue({
        error: 'You have already reported this user',
      });

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(409);
    });

    it('should return 403 when user is not a member', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue({
        error: 'You must be a member',
      });

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(403);
    });

    it('should return 500 for other service errors', async () => {
      (reportService.createReport as jest.Mock).mockResolvedValue({ error: 'Database error' });

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(500);
    });

    it('should return 500 on exception', async () => {
      (reportService.createReport as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      const res = await supertest(app).post('/api/report/create').send(createBody);

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Error creating report');
    });
  });

  describe('POST /api/report/getByUser', () => {
    it('should get reports successfully', async () => {
      (reportService.getReportsByUser as jest.Mock).mockResolvedValue([mockReport]);

      const res = await supertest(app)
        .post('/api/report/getByUser')
        .send({ communityId: 'comm1', username: 'user1' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('should return 500 on service error', async () => {
      (reportService.getReportsByUser as jest.Mock).mockResolvedValue({ error: 'DB error' });

      const res = await supertest(app)
        .post('/api/report/getByUser')
        .send({ communityId: 'comm1', username: 'user1' });

      expect(res.status).toBe(500);
    });

    it('should return 500 on exception', async () => {
      (reportService.getReportsByUser as jest.Mock).mockRejectedValue(new Error('Failed'));

      const res = await supertest(app)
        .post('/api/report/getByUser')
        .send({ communityId: 'comm1', username: 'user1' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Error fetching reports');
    });
  });

  describe('GET /api/report/pending/:communityId', () => {
    it('should get pending reports successfully', async () => {
      (reportService.getPendingReportsByCommunity as jest.Mock).mockResolvedValue([mockReport]);

      const res = await supertest(app).get('/api/report/pending/comm1');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('should return 500 on service error', async () => {
      (reportService.getPendingReportsByCommunity as jest.Mock).mockResolvedValue({
        error: 'DB error',
      });

      const res = await supertest(app).get('/api/report/pending/comm1');

      expect(res.status).toBe(500);
    });

    it('should return 500 on exception', async () => {
      (reportService.getPendingReportsByCommunity as jest.Mock).mockRejectedValue(
        new Error('Failed'),
      );

      const res = await supertest(app).get('/api/report/pending/comm1');

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Error fetching pending reports');
    });
  });

  describe('POST /api/report/updateStatus', () => {
    const updateBody = { reportId: 'report1', status: 'reviewed' as const, reviewedBy: 'mod1' };

    it('should update report status successfully', async () => {
      const updated = { ...mockReport, status: 'reviewed' };
      (reportService.updateReportStatus as jest.Mock).mockResolvedValue(updated);

      const res = await supertest(app).post('/api/report/updateStatus').send(updateBody);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('reviewed');
    });

    it('should return 404 when report not found', async () => {
      (reportService.updateReportStatus as jest.Mock).mockResolvedValue({
        error: 'Report not found',
      });

      const res = await supertest(app).post('/api/report/updateStatus').send(updateBody);

      expect(res.status).toBe(404);
    });

    it('should return 500 for other service errors', async () => {
      (reportService.updateReportStatus as jest.Mock).mockResolvedValue({ error: 'Update failed' });

      const res = await supertest(app).post('/api/report/updateStatus').send(updateBody);

      expect(res.status).toBe(500);
    });

    it('should return 500 on exception', async () => {
      (reportService.updateReportStatus as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      const res = await supertest(app).post('/api/report/updateStatus').send(updateBody);

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Error updating report status');
    });
  });
});
