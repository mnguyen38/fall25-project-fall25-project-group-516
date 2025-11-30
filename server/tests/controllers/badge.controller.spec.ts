import supertest from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import * as badgeService from '../../services/badge.service';
import { setupMockAuth } from '../../utils/mocks.util';

jest.mock('../../middleware/token.middleware');
jest.mock('../../services/badge.service');

describe('badge.controller', () => {
  beforeEach(() => {
    setupMockAuth();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  const mockBadge = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Badge',
    description: 'Test description',
    icon: 'test-icon',
    category: 'participation' as const,
    requirement: { type: 'question_count' as const, threshold: 5 },
    hint: 'Test hint',
    progress: true,
    coinValue: 10,
  };

  describe('POST /api/badge/create', () => {
    it('should create badge successfully', async () => {
      (badgeService.createBadge as jest.Mock).mockResolvedValue(mockBadge);

      const res = await supertest(app).post('/api/badge/create').send(mockBadge);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Badge');
    });

    it('should return 400 if badge creation fails', async () => {
      (badgeService.createBadge as jest.Mock).mockResolvedValue(null);

      const res = await supertest(app).post('/api/badge/create').send(mockBadge);

      expect(res.status).toBe(400);
      expect(res.text).toBe('Failed to create badge');
    });

    it('should return 500 on error', async () => {
      (badgeService.createBadge as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await supertest(app).post('/api/badge/create').send(mockBadge);

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error creating badge');
    });
  });

  describe('GET /api/badge/all', () => {
    it('should return all badges', async () => {
      (badgeService.getAllBadges as jest.Mock).mockResolvedValue([mockBadge]);

      const res = await supertest(app).get('/api/badge/all');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Test Badge');
    });

    it('should return 500 on error', async () => {
      (badgeService.getAllBadges as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await supertest(app).get('/api/badge/all');

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error fetching badges');
    });
  });

  describe('GET /api/badge/:badgeId', () => {
    it('should return specific badge', async () => {
      (badgeService.getBadgeById as jest.Mock).mockResolvedValue(mockBadge);

      const res = await supertest(app).get(`/api/badge/${mockBadge._id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Badge');
    });

    it('should return 404 if badge not found', async () => {
      (badgeService.getBadgeById as jest.Mock).mockResolvedValue(null);

      const res = await supertest(app).get('/api/badge/123');

      expect(res.status).toBe(404);
      expect(res.text).toBe('Badge not found');
    });

    it('should return 500 on error', async () => {
      (badgeService.getBadgeById as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await supertest(app).get('/api/badge/123');

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error fetching badge');
    });
  });

  describe('GET /api/badge/user/:username', () => {
    it('should return user badges with progress', async () => {
      const userBadges = [{ ...mockBadge, userProgress: 3, earned: false }];
      (badgeService.getUserBadgesWithProgress as jest.Mock).mockResolvedValue(userBadges);

      const res = await supertest(app).get('/api/badge/user/testuser');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].userProgress).toBe(3);
      expect(res.body[0].earned).toBe(false);
    });

    it('should return 500 on error', async () => {
      (badgeService.getUserBadgesWithProgress as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const res = await supertest(app).get('/api/badge/user/testuser');

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error fetching user badges');
    });
  });

  describe('POST /api/badge/award/:username', () => {
    it('should award badges successfully', async () => {
      const newBadges = [mockBadge];
      (badgeService.checkAndAwardBadges as jest.Mock).mockResolvedValue(newBadges);

      const res = await supertest(app).post('/api/badge/award/testuser');

      expect(res.status).toBe(200);
      expect(res.body.newBadges.length).toBe(1);
      expect(res.body.newBadges[0].name).toBe('Test Badge');
    });

    it('should return 500 on error', async () => {
      (badgeService.checkAndAwardBadges as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await supertest(app).post('/api/badge/award/testuser');

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error awarding badges');
    });
  });

  describe('PATCH /api/badge/updateDisplayed', () => {
    it('should update displayed badges', async () => {
      (badgeService.updateDisplayedBadges as jest.Mock).mockResolvedValue(true);

      const res = await supertest(app)
        .patch('/api/badge/updateDisplayed')
        .send({ username: 'testuser', badgeIds: ['id1', 'id2'] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('should return 400 for invalid request (missing username)', async () => {
      const res = await supertest(app)
        .patch('/api/badge/updateDisplayed')
        .send({ badgeIds: ['id1'] });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Invalid request');
    });

    it('should return 400 for invalid request (badgeIds not array)', async () => {
      const res = await supertest(app)
        .patch('/api/badge/updateDisplayed')
        .send({ username: 'testuser', badgeIds: 'not-array' });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Invalid request');
    });

    it('should return 400 if update fails', async () => {
      (badgeService.updateDisplayedBadges as jest.Mock).mockResolvedValue(false);

      const res = await supertest(app)
        .patch('/api/badge/updateDisplayed')
        .send({ username: 'testuser', badgeIds: ['id1'] });

      expect(res.status).toBe(400);
      expect(res.text).toBe('Failed to update displayed badges');
    });

    it('should return 500 on error', async () => {
      (badgeService.updateDisplayedBadges as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await supertest(app)
        .patch('/api/badge/updateDisplayed')
        .send({ username: 'testuser', badgeIds: ['id1'] });

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error updating displayed badges');
    });
  });
});
