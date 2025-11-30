import supertest from 'supertest';
import { ObjectId } from 'mongodb';
import { app } from '../../app';
import * as notificationService from '../../services/notification.service';
import { setupMockAuth } from '../../utils/mocks.util';
import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';

jest.mock('../../middleware/token.middleware');

const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

describe('POST /sendNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockAuth();
  });

  it('should send notification successfully', async () => {
    const mockNotification: DatabaseNotification = {
      _id: new ObjectId(),
      title: 'Test Notification',
      msg: 'This is a test',
      dateTime: new Date(),
      sender: 'testuser',
      contextId: new ObjectId(),
      type: 'answer',
    };

    const requestBody = {
      recipients: ['user1', 'user2'],
      notification: {
        title: 'Test Notification',
        msg: 'This is a test',
        dateTime: new Date(),
        sender: 'testuser',
        contextId: new ObjectId(),
        type: 'answer' as const,
      },
    };

    sendNotificationSpy.mockResolvedValue(mockNotification);

    const response = await supertest(app).post('/api/notifications/sendNotification').send(requestBody);

    expect(response.status).toBe(200);
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      requestBody.recipients,
      expect.objectContaining({
        title: 'Test Notification',
        msg: 'This is a test',
        sender: 'testuser',
        type: 'answer',
      }),
    );
  });

  it('should return 500 when sendNotification returns error', async () => {
    const requestBody = {
      recipients: ['user1', 'user2'],
      notification: {
        title: 'Test Notification',
        msg: 'This is a test',
        dateTime: new Date(),
        sender: 'testuser',
        contextId: new ObjectId(),
        type: 'answer' as const,
      },
    };

    sendNotificationSpy.mockResolvedValue({ error: 'Failed to send notification' });

    const response = await supertest(app).post('/api/notifications/sendNotification').send(requestBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when sending notification');
  });

  it('should return 500 when sendNotification throws exception', async () => {
    const requestBody = {
      recipients: ['user1', 'user2'],
      notification: {
        title: 'Test Notification',
        msg: 'This is a test',
        dateTime: new Date(),
        sender: 'testuser',
        contextId: new ObjectId(),
        type: 'answer' as const,
      },
    };

    sendNotificationSpy.mockRejectedValue(new Error('Database error'));

    const response = await supertest(app).post('/api/notifications/sendNotification').send(requestBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when sending notification');
    expect(response.text).toContain('Database error');
  });
});
