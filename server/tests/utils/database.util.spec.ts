import { populateDocument, populateUser } from '../../utils/database.util';
import QuestionModel from '../../models/questions.model';
import AnswerModel from '../../models/answers.model';
import ChatModel from '../../models/chat.model';
import UserModel from '../../models/users.model';
import CollectionModel from '../../models/collection.model';
import NotificationModel from '../../models/notifications.model';

jest.mock('../../models/questions.model');
jest.mock('../../models/answers.model');
jest.mock('../../models/chat.model');
jest.mock('../../models/messages.model');
jest.mock('../../models/users.model');
jest.mock('../../models/tags.model');
jest.mock('../../models/comments.model');
jest.mock('../../models/collection.model');
jest.mock('../../models/notifications.model');

describe('populateDocument', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and populate a question document', async () => {
    const mockQuestion = {
      _id: 'questionId',
      tags: ['tagId'],
      answers: ['answerId'],
      comments: ['commentId'],
    };
    (QuestionModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockQuestion),
    });

    const result = await populateDocument('questionId', 'question');

    expect(QuestionModel.findOne).toHaveBeenCalledWith({ _id: 'questionId' });
    expect(result).toEqual(mockQuestion);
  });

  it('should return an error message if question document is not found', async () => {
    (QuestionModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const questionID = 'invalidQuestionId';
    const result = await populateDocument(questionID, 'question');

    expect(result).toEqual({
      error: `Error when fetching and populating a document: Failed to fetch and populate question with ID: ${
        questionID
      }`,
    });
  });

  it('should return an error message if fetching a question document throws an error', async () => {
    (QuestionModel.findOne as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument('questionId', 'question');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should fetch and populate an answer document', async () => {
    const mockAnswer = {
      _id: 'answerId',
      comments: ['commentId'],
    };
    (AnswerModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockAnswer),
    });

    const result = await populateDocument('answerId', 'answer');

    expect(AnswerModel.findOne).toHaveBeenCalledWith({ _id: 'answerId' });
    expect(result).toEqual(mockAnswer);
  });

  it('should return an error message if answer document is not found', async () => {
    (AnswerModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const answerID = 'invalidAnswerId';
    const result = await populateDocument(answerID, 'answer');

    expect(result).toEqual({
      error: `Error when fetching and populating a document: Failed to fetch and populate answer with ID: ${
        answerID
      }`,
    });
  });

  it('should return an error message if fetching an answer document throws an error', async () => {
    (AnswerModel.findOne as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument('answerId', 'answer');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should fetch and populate a chat document', async () => {
    const mockChat = {
      _id: 'chatId',
      messages: [
        {
          _id: 'messageId',
          msg: 'Hello',
          msgFrom: 'user1',
          msgDateTime: new Date(),
          type: 'text',
        },
      ],
      toObject: jest.fn().mockReturnValue({
        _id: 'chatId',
        messages: [
          {
            _id: 'messageId',
            msg: 'Hello',
            msgFrom: 'user1',
            msgDateTime: new Date(),
            type: 'text',
          },
        ],
      }),
    };
    const mockUser = {
      _id: 'userId',
      username: 'user1',
    };
    (ChatModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockChat),
    });
    (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

    const result = await populateDocument('chatId', 'chat');

    expect(ChatModel.findOne).toHaveBeenCalledWith({ _id: 'chatId' });
    expect(result).toEqual({
      ...mockChat.toObject(),
      messages: [
        {
          _id: 'messageId',
          msg: 'Hello',
          msgFrom: 'user1',
          msgDateTime: mockChat.messages[0].msgDateTime,
          type: 'text',
          user: {
            _id: 'userId',
            username: 'user1',
          },
        },
      ],
    });
  });

  it('should return an error message if chat document is not found', async () => {
    (ChatModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const result = await populateDocument('invalidChatId', 'chat');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Chat not found',
    });
  });

  it('should return an error message if fetching a chat document throws an error', async () => {
    (ChatModel.findOne as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument('chatId', 'chat');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should return an error message if type is invalid', async () => {
    const invalidType = 'invalidType' as 'question' | 'answer' | 'chat';
    const result = await populateDocument('someId', invalidType);
    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Invalid type provided.',
    });
  });

  it('should fetch and populate a collection document', async () => {
    const mockQuestion = { _id: 'q1', title: 'Test' };
    const mockCollection = {
      _id: 'collId',
      questions: ['q1'],
      toObject: jest.fn().mockReturnValue({ _id: 'collId', questions: ['q1'] }),
    };
    (CollectionModel.findOne as jest.Mock).mockResolvedValue(mockCollection);
    (QuestionModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockQuestion),
    });

    const result = await populateDocument('collId', 'collection');

    expect(CollectionModel.findOne).toHaveBeenCalledWith({ _id: 'collId' });
    expect(result).toHaveProperty('questions');
  });

  it('should return null if collection not found', async () => {
    (CollectionModel.findOne as jest.Mock).mockResolvedValue(null);

    const result = await populateDocument('invalidId', 'collection');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Failed to fetch and populate collection with ID: invalidId',
    });
  });
});

describe('populateUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if user not found', async () => {
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(populateUser('userId')).rejects.toThrow('User not found');
  });

  it('should populate user with notifications', async () => {
    const mockNotif = { _id: 'notifId', title: 'Test', msg: 'Message' };
    const mockUser = {
      _id: 'userId',
      username: 'testuser',
      notifications: [{ notification: 'notifId', read: false }],
    };

    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    (NotificationModel.findOne as jest.Mock).mockResolvedValue(mockNotif);

    const result = await populateUser('userId');

    expect(result.notifications?.length).toBe(1);
    expect(result.notifications?.[0].notification).toEqual(mockNotif);
    expect(result.notifications?.[0].read).toBe(false);
  });

  it('should throw error if notification not found', async () => {
    const mockUser = {
      _id: 'userId',
      username: 'testuser',
      notifications: [{ notification: 'notifId', read: false }],
    };

    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    (NotificationModel.findOne as jest.Mock).mockResolvedValue(null);

    await expect(populateUser('userId')).rejects.toThrow('Notification not found');
  });

  it('should handle user with no notifications', async () => {
    const mockUser = {
      _id: 'userId',
      username: 'testuser',
      notifications: undefined,
    };

    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      }),
    });

    const result = await populateUser('userId');

    expect(result.notifications).toEqual([]);
  });
});
