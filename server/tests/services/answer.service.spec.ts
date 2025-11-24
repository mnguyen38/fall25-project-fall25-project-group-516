import mongoose from 'mongoose';
import AnswerModel from '../../models/answers.model';
import QuestionModel from '../../models/questions.model';
import {
  saveAnswer,
  addAnswerToQuestion,
  isAllowedToPostOnAnswer,
  getMostRecentAnswerTime,
} from '../../services/answer.service';
import {
  DatabaseAnswer,
  DatabaseQuestion,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
} from '../../types/types';
import { QUESTIONS, ans1, ans4, community1 } from '../mockData.models';
import CommunityModel from '../../models/community.model';

describe('Answer model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAnswer', () => {
    test('saveAnswer should return the saved answer', async () => {
      const mockAnswer = {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-06'),
        comments: [],
      };
      const mockDBAnswer = {
        ...mockAnswer,
        _id: new mongoose.Types.ObjectId(),
      };

      jest
        .spyOn(AnswerModel, 'create')
        .mockResolvedValueOnce(mockDBAnswer as unknown as ReturnType<typeof AnswerModel.create>);

      const result = (await saveAnswer(mockAnswer)) as DatabaseAnswer;

      expect(result._id).toBeDefined();
      expect(result.text).toEqual(mockAnswer.text);
      expect(result.ansBy).toEqual(mockAnswer.ansBy);
      expect(result.ansDateTime).toEqual(mockAnswer.ansDateTime);
    });

    test('saveAnswer should return error with incorrect answer format', async () => {
      const mockAnswer = {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-06'),
        comments: [],
      };
      const mockError = new Error('Database connection failed');

      jest
        .spyOn(AnswerModel, 'create')
        .mockRejectedValueOnce(mockError as unknown as ReturnType<typeof AnswerModel.create>);

      const result = (await saveAnswer(mockAnswer)) as DatabaseAnswer;

      expect('error' in result).toBe(true);
    });
  });

  describe('addAnswerToQuestion', () => {
    test('addAnswerToQuestion should return the updated question', async () => {
      const question: DatabaseQuestion = QUESTIONS.filter(
        q => q._id && q._id.toString() === '65e9b5a995b6c7045a30d823',
      )[0];

      jest.spyOn(QuestionModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: null }),
      } as any);
      jest
        .spyOn(QuestionModel, 'findOneAndUpdate')
        .mockResolvedValueOnce({ ...question, answers: [...question.answers, ans4._id] });

      const result = (await addAnswerToQuestion(
        '65e9b5a995b6c7045a30d823',
        ans4,
      )) as DatabaseQuestion;

      expect(result.answers.length).toEqual(4);
      expect(result.answers).toContain(ans4._id);
    });

    test('addAnswerToQuestion should return an object with error if findOneAndUpdate throws an error', async () => {
      jest.spyOn(QuestionModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: null }),
      } as any);
      jest
        .spyOn(QuestionModel, 'findOneAndUpdate')
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await addAnswerToQuestion('65e9b5a995b6c7045a30d823', ans1);

      expect(result).toHaveProperty('error');
    });

    test('addAnswerToQuestion should return an object with error if findOneAndUpdate returns null', async () => {
      jest.spyOn(QuestionModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: null }),
      } as any);
      jest.spyOn(QuestionModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const result = await addAnswerToQuestion('65e9b5a995b6c7045a30d823', ans1);

      expect(result).toHaveProperty('error');
    });

    test('addAnswerToQuestion should return an error if a required field is missing in the answer', async () => {
      const invalidAnswer: Partial<DatabaseAnswer> = {
        text: 'This is an answer text',
        ansBy: 'user123', // Missing ansDateTime
      };

      const qid = 'validQuestionId';

      const result = await addAnswerToQuestion(qid, invalidAnswer as DatabaseAnswer);

      expect(result).toEqual({ error: 'Invalid answer' });
    });

    test('addAnswerToQuestion should return an error if user is muted in community', async () => {
      const question: DatabaseQuestion = { ...QUESTIONS[0], community: community1._id };

      jest.spyOn(QuestionModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: question.community }),
      } as any);
      jest.spyOn(CommunityModel, 'findOne').mockResolvedValueOnce(null);

      const result = await addAnswerToQuestion(question._id.toString(), ans1);
      expect('error' in result).toBe(true);
    });
  });

  describe('isAllowedToPostOnAnswer', () => {
    test('should throw error when answer not found', async () => {
      jest.spyOn(QuestionModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(isAllowedToPostOnAnswer(ans1._id.toString(), 'testUser')).rejects.toThrow(
        'Answer not found',
      );
    });

    test('should return true if community is null', async () => {
      jest.spyOn(QuestionModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: null }),
      } as any);
      const result = await isAllowedToPostOnAnswer(ans1._id.toString(), 'testUser');

      expect(result).toBe(true);
    });

    test('should return true if allowed to post on answer', async () => {
      jest.spyOn(QuestionModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ community: community1._id }),
      } as any);

      jest.spyOn(CommunityModel, 'findOne').mockResolvedValueOnce(community1);
      const result = await isAllowedToPostOnAnswer(ans1._id.toString(), 'testUser');

      expect(result).toBe(true);
    });
  });
  describe('getMostRecentAnswerTime', () => {
    test('should set the map with the answer date if map is empty', () => {
      const mp = new Map<string, Date>();
      const qId = new mongoose.Types.ObjectId();
      const ansDate = new Date('2024-01-01');

      const mockQuestion = {
        _id: qId,
        answers: [{ ansDateTime: ansDate } as PopulatedDatabaseAnswer],
      } as PopulatedDatabaseQuestion;

      getMostRecentAnswerTime(mockQuestion, mp);

      expect(mp.get(qId.toString())).toEqual(ansDate);
    });

    test('should update the map if the answer is more recent than existing entry', () => {
      const qId = new mongoose.Types.ObjectId();
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2024-01-01');
      const mp = new Map<string, Date>();

      // Set initial state
      mp.set(qId.toString(), oldDate);

      const mockQuestion = {
        _id: qId,
        answers: [{ ansDateTime: newDate } as PopulatedDatabaseAnswer],
      } as PopulatedDatabaseQuestion;

      getMostRecentAnswerTime(mockQuestion, mp);

      expect(mp.get(qId.toString())).toEqual(newDate);
    });

    test('should NOT update the map if the answer is older than existing entry', () => {
      const qId = new mongoose.Types.ObjectId();
      const newerDate = new Date('2024-01-01');
      const olderDate = new Date('2023-01-01');
      const mp = new Map<string, Date>();

      // Set initial state
      mp.set(qId.toString(), newerDate);

      const mockQuestion = {
        _id: qId,
        answers: [{ ansDateTime: olderDate } as PopulatedDatabaseAnswer],
      } as PopulatedDatabaseQuestion;

      getMostRecentAnswerTime(mockQuestion, mp);

      expect(mp.get(qId.toString())).toEqual(newerDate);
    });

    test('should handle questions with no answers', () => {
      const qId = new mongoose.Types.ObjectId();
      const mp = new Map<string, Date>();

      const mockQuestion = {
        _id: qId,
        answers: [],
      } as unknown as PopulatedDatabaseQuestion;

      getMostRecentAnswerTime(mockQuestion, mp);

      expect(mp.has(qId.toString())).toBe(false);
    });
  });
});
