import mongoose from 'mongoose';
import BadgeModel from '../../models/badges.model';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import AnswerModel from '../../models/answers.model';
import CommentModel from '../../models/comments.model';
import {
  createBadge,
  getAllBadges,
  getBadgeById,
  calculateBadgeProgress,
  getUserBadgesWithProgress,
  checkAndAwardBadges,
  updateDisplayedBadges,
} from '../../services/badge.service';
import { DatabaseBadge } from '@fake-stack-overflow/shared/types/badge';

// Mock the models
jest.mock('../../models/badges.model');
jest.mock('../../models/users.model');
jest.mock('../../models/questions.model');
jest.mock('../../models/answers.model');
jest.mock('../../models/comments.model');

const mockBadge = {
  _id: new mongoose.Types.ObjectId(),
  name: 'First Question',
  description: 'Ask your first question',
  icon: 'question-icon',
  category: 'participation' as const,
  requirement: {
    type: 'first_question' as const,
    threshold: 1,
  },
  hint: 'Ask a question to earn this badge',
  progress: true,
  coinValue: 10,
};

const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  username: 'testuser',
  badges: [],
  maxLoginStreak: 5,
};

describe('badge.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBadge', () => {
    it('should return existing badge if badge with same name already exists', async () => {
      const existingBadge = { ...mockBadge };
      (BadgeModel.findOne as jest.Mock).mockResolvedValueOnce(existingBadge);

      const result = await createBadge({
        name: 'First Question',
        description: 'Ask your first question',
        icon: 'question-icon',
        category: 'participation',
        requirement: { type: 'first_question', threshold: 1 },
        hint: 'Ask a question',
        progress: true,
        coinValue: 10,
      });

      expect(result).toEqual(existingBadge);
      expect(BadgeModel.findOne).toHaveBeenCalledWith({ name: 'First Question' });
      expect(BadgeModel.create).not.toHaveBeenCalled();
    });

    it('should create a new badge if badge does not exist', async () => {
      const newBadge = { ...mockBadge };
      (BadgeModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      (BadgeModel.create as jest.Mock).mockResolvedValueOnce(newBadge);

      const result = await createBadge({
        name: 'First Question',
        description: 'Ask your first question',
        icon: 'question-icon',
        category: 'participation',
        requirement: { type: 'first_question', threshold: 1 },
        hint: 'Ask a question',
        progress: true,
        coinValue: 10,
      });

      expect(result).toEqual(newBadge);
      expect(BadgeModel.create).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      (BadgeModel.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await createBadge({
        name: 'First Question',
        description: 'Ask your first question',
        icon: 'question-icon',
        category: 'participation',
        requirement: { type: 'first_question', threshold: 1 },
        hint: 'Ask a question',
        progress: true,
        coinValue: 10,
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllBadges', () => {
    it('should return all badges', async () => {
      const badges = [mockBadge, { ...mockBadge, _id: new mongoose.Types.ObjectId() }];
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce(badges);

      const result = await getAllBadges();

      expect(result).toEqual(badges);
      expect(BadgeModel.find).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      (BadgeModel.find as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await getAllBadges();

      expect(result).toEqual([]);
    });
  });

  describe('getBadgeById', () => {
    it('should return badge by id', async () => {
      (BadgeModel.findById as jest.Mock).mockResolvedValueOnce(mockBadge);

      const result = await getBadgeById(mockBadge._id.toString());

      expect(result).toEqual(mockBadge);
      expect(BadgeModel.findById).toHaveBeenCalledWith(mockBadge._id.toString());
    });

    it('should return null if badge not found', async () => {
      (BadgeModel.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await getBadgeById('invalidId');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (BadgeModel.findById as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await getBadgeById('badgeId');

      expect(result).toBeNull();
    });
  });

  describe('calculateBadgeProgress', () => {
    it('should return 0 if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await calculateBadgeProgress('nonexistent', mockBadge);

      expect(result).toBe(0);
    });

    it('should calculate progress for question_count type', async () => {
      const badge: DatabaseBadge = {
        ...mockBadge,
        requirement: { type: 'question_count' as const, threshold: 5 },
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValueOnce(3);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(3);
      expect(QuestionModel.countDocuments).toHaveBeenCalledWith({ askedBy: 'testuser' });
    });

    it('should calculate progress for answer_count type', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'answer_count' as const, threshold: 5 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (AnswerModel.countDocuments as jest.Mock).mockResolvedValueOnce(7);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(7);
      expect(AnswerModel.countDocuments).toHaveBeenCalledWith({ ansBy: 'testuser' });
    });

    it('should calculate progress for comment_count type', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'comment_count' as const, threshold: 10 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (CommentModel.countDocuments as jest.Mock).mockResolvedValueOnce(12);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(12);
      expect(CommentModel.countDocuments).toHaveBeenCalledWith({ commentedBy: 'testuser' });
    });

    it('should calculate progress for login_streak type', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'login_streak' as const, threshold: 3 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(5); // user's maxLoginStreak
    });

    it('should return 0 for login_streak if maxLoginStreak is undefined', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'login_streak' as const, threshold: 3 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce({ ...mockUser, maxLoginStreak: undefined });

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(0);
    });

    it('should calculate progress for upvote_count type', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'upvote_count' as const, threshold: 10 } };
      const questions = [
        { upVotes: ['user1', 'user2', 'user3'] },
        { upVotes: ['user4', 'user5'] },
        { upVotes: [] },
      ];
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (QuestionModel.find as jest.Mock).mockResolvedValueOnce(questions);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(5); // 3 + 2 + 0
      expect(QuestionModel.find).toHaveBeenCalledWith({ askedBy: 'testuser' });
    });

    it('should handle questions without upVotes array for upvote_count', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'upvote_count' as const, threshold: 10 } };
      const questions = [{ upVotes: null }, { upVotes: undefined }, {}];
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (QuestionModel.find as jest.Mock).mockResolvedValueOnce(questions);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(0);
    });

    it('should calculate progress for first_question type - has questions', async () => {
      const badge = {
        ...mockBadge,
        requirement: { type: 'first_question' as const, threshold: 1 },
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValueOnce(3);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(1);
    });

    it('should calculate progress for first_question type - no questions', async () => {
      const badge = {
        ...mockBadge,
        requirement: { type: 'first_question' as const, threshold: 1 },
      };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(0);
    });

    it('should calculate progress for first_answer type - has answers', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'first_answer' as const, threshold: 1 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (AnswerModel.countDocuments as jest.Mock).mockResolvedValueOnce(2);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(1);
    });

    it('should calculate progress for first_answer type - no answers', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'first_answer' as const, threshold: 1 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (AnswerModel.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(0);
    });

    it('should return 0 for unknown requirement type', async () => {
      const badge: DatabaseBadge = { ...mockBadge, requirement: { type: 'unknown_type' as any, threshold: 1 } };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await calculateBadgeProgress('testuser', badge);

      expect(result).toBe(0);
    });

    it('should return 0 on error', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await calculateBadgeProgress('testuser', mockBadge);

      expect(result).toBe(0);
    });
  });

  describe('getUserBadgesWithProgress', () => {
    it('should return empty array if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await getUserBadgesWithProgress('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return all badges with progress for user', async () => {
      const badge1 = { ...mockBadge };
      const badge2 = {
        ...mockBadge,
        _id: new mongoose.Types.ObjectId(),
        name: 'First Answer',
        requirement: { type: 'first_answer' as const, threshold: 1 },
      };

      const userWithBadges = {
        ...mockUser,
        badges: [badge1._id],
      };

      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(userWithBadges);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([badge1, badge2]);
      (UserModel.findOne as jest.Mock).mockResolvedValue(userWithBadges);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(1);
      (AnswerModel.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await getUserBadgesWithProgress('testuser');

      expect(result).toHaveLength(2);
      expect(result[0].earned).toBe(true);
      expect(result[0].userProgress).toBe(1);
      expect(result[1].earned).toBe(false);
      expect(result[1].userProgress).toBe(0);
    });

    it('should return empty array on error', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await getUserBadgesWithProgress('testuser');

      expect(result).toEqual([]);
    });

    it('should handle user with no badges', async () => {
      const userNoBadges = { ...mockUser, badges: undefined };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(userNoBadges);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([mockBadge]);
      (UserModel.findOne as jest.Mock).mockResolvedValue(userNoBadges);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await getUserBadgesWithProgress('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].earned).toBe(false);
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should return empty array if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await checkAndAwardBadges('nonexistent');

      expect(result).toEqual([]);
    });

    it('should award badges when requirements are met', async () => {
      const badge1 = {
        ...mockBadge,
        requirement: { type: 'question_count' as const, threshold: 3 },
      };
      const badge2 = {
        ...mockBadge,
        _id: new mongoose.Types.ObjectId(),
        name: 'Answer Expert',
        requirement: { type: 'answer_count' as const, threshold: 5 },
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([badge1, badge2]);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (AnswerModel.countDocuments as jest.Mock).mockResolvedValue(3);
      (UserModel.updateOne as jest.Mock).mockResolvedValue({});

      const result = await checkAndAwardBadges('testuser');

      expect(result).toEqual([badge1]); // Only badge1 threshold met (5 >= 3)
      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { username: 'testuser' },
        { $addToSet: { badges: badge1._id } },
      );
    });

    it('should not award badges user already has', async () => {
      const badge1 = { ...mockBadge };
      const userWithBadge = {
        ...mockUser,
        badges: [badge1._id],
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(userWithBadge);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([badge1]);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(10);

      const result = await checkAndAwardBadges('testuser');

      expect(result).toEqual([]);
      expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it('should not award badges if threshold not met', async () => {
      const badge1 = {
        ...mockBadge,
        requirement: { type: 'question_count' as const, threshold: 10 },
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([badge1]);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await checkAndAwardBadges('testuser');

      expect(result).toEqual([]);
      expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it('should handle user with no badges array', async () => {
      const userNoBadges = { ...mockUser, badges: undefined };
      const badge1 = {
        ...mockBadge,
        requirement: { type: 'question_count' as const, threshold: 1 },
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(userNoBadges);
      (BadgeModel.find as jest.Mock).mockResolvedValueOnce([badge1]);
      (QuestionModel.countDocuments as jest.Mock).mockResolvedValue(2);
      (UserModel.updateOne as jest.Mock).mockResolvedValue({});

      const result = await checkAndAwardBadges('testuser');

      expect(result).toEqual([badge1]);
    });

    it('should throw error on database failure', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(checkAndAwardBadges('testuser')).rejects.toThrow(
        'Failed to check and award badges',
      );
    });
  });

  describe('updateDisplayedBadges', () => {
    it('should return false if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateDisplayedBadges('nonexistent', []);

      expect(result).toBe(false);
    });

    it('should update displayed badges with valid badge IDs', async () => {
      const badge1Id = new mongoose.Types.ObjectId();
      const badge2Id = new mongoose.Types.ObjectId();
      const userWithBadges = {
        ...mockUser,
        badges: [badge1Id, badge2Id],
      };

      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(userWithBadges);
      (UserModel.updateOne as jest.Mock).mockResolvedValueOnce({});

      const result = await updateDisplayedBadges('testuser', [
        badge1Id.toString(),
        badge2Id.toString(),
      ]);

      expect(result).toBe(true);
      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { username: 'testuser' },
        { displayedBadges: [badge1Id, badge2Id] },
      );
    });

    it('should filter out invalid badge IDs', async () => {
      const badge1Id = new mongoose.Types.ObjectId();
      const badge2Id = new mongoose.Types.ObjectId();
      const invalidBadgeId = new mongoose.Types.ObjectId();
      const userWithBadges = {
        ...mockUser,
        badges: [badge1Id],
      };

      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(userWithBadges);
      (UserModel.updateOne as jest.Mock).mockResolvedValueOnce({});

      const result = await updateDisplayedBadges('testuser', [
        badge1Id.toString(),
        invalidBadgeId.toString(), // User doesn't have this badge
      ]);

      expect(result).toBe(true);
      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { username: 'testuser' },
        { displayedBadges: [badge1Id] }, // Only valid badge included
      );
    });

    it('should handle user with no badges', async () => {
      const userNoBadges = { ...mockUser, badges: undefined };
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(userNoBadges);
      (UserModel.updateOne as jest.Mock).mockResolvedValueOnce({});

      const result = await updateDisplayedBadges('testuser', [
        new mongoose.Types.ObjectId().toString(),
      ]);

      expect(result).toBe(true);
      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { username: 'testuser' },
        { displayedBadges: [] }, // No valid badges
      );
    });

    it('should return false on error', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await updateDisplayedBadges('testuser', []);

      expect(result).toBe(false);
    });
  });
});
