import { ObjectId } from 'mongodb';
import {
  sortQuestionsByNewest,
  sortQuestionsByUnanswered,
  sortQuestionsByActive,
  sortQuestionsByMostViews,
} from '../../utils/sort.util';
import { PopulatedDatabaseQuestion } from '../../types/types';
import * as answerService from '../../services/answer.service';

jest.mock('../../services/answer.service');

describe('sort.util', () => {
  const createMockQuestion = (
    overrides: Partial<PopulatedDatabaseQuestion>,
  ): PopulatedDatabaseQuestion => ({
    _id: new ObjectId(),
    title: 'Test Question',
    text: 'Test text',
    tags: [],
    askedBy: 'testuser',
    askDateTime: new Date(),
    views: [],
    upVotes: [],
    downVotes: [],
    answers: [],
    comments: [],
    community: null,
    premiumStatus: false,
    interestedUsers: [],
    ...overrides,
  });

  describe('sortQuestionsByNewest', () => {
    it('should sort premium question before non-premium', () => {
      const premiumQ = createMockQuestion({
        premiumStatus: true,
        askDateTime: new Date('2024-01-01'),
      });
      const regularQ = createMockQuestion({
        premiumStatus: false,
        askDateTime: new Date('2024-01-02'),
      });

      const result = sortQuestionsByNewest([regularQ, premiumQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort non-premium question after premium', () => {
      const premiumQ = createMockQuestion({
        premiumStatus: true,
        askDateTime: new Date('2024-01-01'),
      });
      const regularQ = createMockQuestion({
        premiumStatus: false,
        askDateTime: new Date('2024-01-02'),
      });

      const result = sortQuestionsByNewest([premiumQ, regularQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort by newest date when both are non-premium', () => {
      const older = createMockQuestion({ askDateTime: new Date('2024-01-01') });
      const newer = createMockQuestion({ askDateTime: new Date('2024-01-02') });

      const result = sortQuestionsByNewest([older, newer]);

      expect(result[0]).toBe(newer);
      expect(result[1]).toBe(older);
    });
  });

  describe('sortQuestionsByUnanswered', () => {
    it('should filter unanswered questions and sort by newest', () => {
      const unanswered = createMockQuestion({
        answers: [],
        askDateTime: new Date('2024-01-02'),
      });
      const answered = createMockQuestion({
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
        askDateTime: new Date('2024-01-01'),
      });

      const result = sortQuestionsByUnanswered([answered, unanswered]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(unanswered);
    });
  });

  describe('sortQuestionsByActive', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should sort premium question before non-premium in active sort', () => {
      const premiumQ = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860ea'),
        premiumStatus: true,
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });
      const regularQ = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860eb'),
        premiumStatus: false,
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });

      (answerService.getMostRecentAnswerTime as jest.Mock).mockImplementation(
        (q: PopulatedDatabaseQuestion, mp: Map<string, Date>) => {
          mp.set(q._id.toString(), new Date('2024-01-01'));
        },
      );

      const result = sortQuestionsByActive([regularQ, premiumQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort non-premium question after premium in active sort', () => {
      const premiumQ = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860ea'),
        premiumStatus: true,
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });
      const regularQ = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860eb'),
        premiumStatus: false,
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });

      (answerService.getMostRecentAnswerTime as jest.Mock).mockImplementation(
        (q: PopulatedDatabaseQuestion, mp: Map<string, Date>) => {
          mp.set(q._id.toString(), new Date('2024-01-01'));
        },
      );

      const result = sortQuestionsByActive([premiumQ, regularQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort by most recent answer when both are non-premium', () => {
      const older = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860ea'),
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });
      const newer = createMockQuestion({
        _id: new ObjectId('507f191e810c19729de860eb'),
        answers: [
          {
            _id: new ObjectId(),
            text: 'Answer',
            ansBy: 'user1',
            ansDateTime: new Date(),
            comments: [],
          },
        ],
      });

      (answerService.getMostRecentAnswerTime as jest.Mock).mockImplementation(
        (q: PopulatedDatabaseQuestion, mp: Map<string, Date>) => {
          if (q._id.toString() === older._id.toString()) {
            mp.set(q._id.toString(), new Date('2024-01-01'));
          } else {
            mp.set(q._id.toString(), new Date('2024-01-02'));
          }
        },
      );

      const result = sortQuestionsByActive([older, newer]);

      expect(result[0]).toBe(newer);
    });
  });

  describe('sortQuestionsByMostViews', () => {
    it('should sort premium question before non-premium by views', () => {
      const premiumQ = createMockQuestion({
        premiumStatus: true,
        views: ['user1'],
      });
      const regularQ = createMockQuestion({
        premiumStatus: false,
        views: ['user1', 'user2', 'user3'],
      });

      const result = sortQuestionsByMostViews([regularQ, premiumQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort non-premium question after premium by views', () => {
      const premiumQ = createMockQuestion({
        premiumStatus: true,
        views: ['user1'],
      });
      const regularQ = createMockQuestion({
        premiumStatus: false,
        views: ['user1', 'user2', 'user3'],
      });

      const result = sortQuestionsByMostViews([premiumQ, regularQ]);

      expect(result[0]).toBe(premiumQ);
      expect(result[1]).toBe(regularQ);
    });

    it('should sort by most views when both are non-premium', () => {
      const lessViews = createMockQuestion({
        views: ['user1'],
      });
      const moreViews = createMockQuestion({
        views: ['user1', 'user2', 'user3'],
      });

      const result = sortQuestionsByMostViews([lessViews, moreViews]);

      expect(result[0]).toBe(moreViews);
      expect(result[1]).toBe(lessViews);
    });
  });
});
