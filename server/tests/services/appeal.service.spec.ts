import mongoose, { ClientSession } from 'mongoose';
import AppealModel from '../../models/appeal.model';
import saveAppeal from '../../services/appeal.service';
import { Appeal } from '@fake-stack-overflow/shared';

jest.mock('../../models/appeal.model');

describe('appeal.service', () => {
  let mockSession: Partial<ClientSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
  });

  const mockAppeal: Appeal = {
    community: new mongoose.Types.ObjectId(),
    username: 'user1',
    description: 'Appeal reason',
    appealDateTime: new Date(),
  };

  describe('saveAppeal', () => {
    it('should successfully save appeal with session', async () => {
      const mockSavedAppeal = {
        ...mockAppeal,
        _id: new mongoose.Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ ...mockAppeal, _id: new mongoose.Types.ObjectId() }),
      };

      (AppealModel.create as jest.Mock).mockResolvedValue([mockSavedAppeal]);

      const result = await saveAppeal(mockAppeal, mockSession as ClientSession);

      expect(AppealModel.create).toHaveBeenCalledWith([mockAppeal], { session: mockSession });
      expect('error' in result).toBe(false);
    });

    it('should return error when appeal creation fails', async () => {
      (AppealModel.create as jest.Mock).mockResolvedValue([null]);

      const result = await saveAppeal(mockAppeal, mockSession as ClientSession);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Failed to create appeal');
      }
    });

    it('should return error on exception', async () => {
      (AppealModel.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await saveAppeal(mockAppeal, mockSession as ClientSession);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Database error');
      }
    });
  });
});
