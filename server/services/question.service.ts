import { ObjectId } from 'mongodb';
import { QueryOptions } from 'mongoose';
import {
  DatabaseComment,
  DatabaseCommunity,
  DatabaseQuestion,
  DatabaseTag,
  DatabaseUser,
  OrderType,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  Question,
  QuestionResponse,
  VoteResponse,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import TagModel from '../models/tags.model';
import CommentModel from '../models/comments.model';
import { parseKeyword, parseTags } from '../utils/parse.util';
import { checkTagInQuestion } from './tag.service';
import {
  sortQuestionsByActive,
  sortQuestionsByMostViews,
  sortQuestionsByNewest,
  sortQuestionsByUnanswered,
} from '../utils/sort.util';
import { isAllowedToPostInCommunity } from './community.service';
import UserModel from '../models/users.model';

/**
 * Checks if keywords exist in a question's title or text.
 * @param {Question} q - The question to check
 * @param {string[]} keywordlist - The keywords to check
 * @returns {boolean} - `true` if any keyword is found
 */
const checkKeywordInQuestion = (q: PopulatedDatabaseQuestion, keywordlist: string[]): boolean => {
  for (const w of keywordlist) {
    if (q.title.includes(w) || q.text.includes(w)) {
      return true;
    }
  }
  return false;
};

/**
 * Retrieves questions ordered by specified criteria.
 * @param {OrderType} order - The order type to filter the questions
 * @returns {Promise<Question[]>} - The ordered list of questions
 */
export const getQuestionsByOrder = async (
  order: OrderType,
): Promise<PopulatedDatabaseQuestion[]> => {
  try {
    const qlist: PopulatedDatabaseQuestion[] = await QuestionModel.find().populate<{
      tags: DatabaseTag[];
      answers: PopulatedDatabaseAnswer[];
      comments: DatabaseComment[];
      community: DatabaseCommunity;
    }>([
      { path: 'tags', model: TagModel },
      { path: 'answers', model: AnswerModel, populate: { path: 'comments', model: CommentModel } },
      { path: 'comments', model: CommentModel },
    ]);

    switch (order) {
      case 'active':
        return sortQuestionsByActive(qlist);
      case 'unanswered':
        return sortQuestionsByUnanswered(qlist);
      case 'newest':
        return sortQuestionsByNewest(qlist);
      case 'mostViewed':
      default:
        return sortQuestionsByMostViews(qlist);
    }
  } catch (error) {
    return [];
  }
};

/**
 * Filters questions by the user who asked them.
 * @param {PopulatedDatabaseQuestion[]} qlist - The list of questions
 * @param {string} askedBy - The username to filter by
 * @returns {PopulatedDatabaseQuestion[]} - Filtered questions
 */
export const filterQuestionsByAskedBy = (
  qlist: PopulatedDatabaseQuestion[],
  askedBy: string,
): PopulatedDatabaseQuestion[] => qlist.filter(q => q.askedBy === askedBy);

/**
 * Filters questions by search string containing tags and/or keywords.
 * @param {PopulatedDatabaseQuestion[]} qlist - The list of questions
 * @param {string} search - The search string
 * @returns {PopulatedDatabaseQuestion[]} - Filtered list of questions
 */
export const filterQuestionsBySearch = (
  qlist: PopulatedDatabaseQuestion[],
  search: string,
): PopulatedDatabaseQuestion[] => {
  const searchTags = parseTags(search);
  const searchKeyword = parseKeyword(search);

  return qlist.filter((question: PopulatedDatabaseQuestion) => {
    if (searchKeyword.length === 0 && searchTags.length === 0) {
      return true;
    }

    if (searchKeyword.length === 0) {
      return checkTagInQuestion(question, searchTags);
    }

    if (searchTags.length === 0) {
      return checkKeywordInQuestion(question, searchKeyword);
    }

    return (
      checkKeywordInQuestion(question, searchKeyword) || checkTagInQuestion(question, searchTags)
    );
  });
};

/**
 * Filters questions based on blocking relationships.
 * Removes questions where:
 * - The viewing user has blocked the question author
 * - The question author has blocked the viewing user
 * @param {PopulatedDatabaseQuestion[]} qlist - The list of questions
 * @param {string} viewingUsername - The username of the user viewing the questions
 * @returns {Promise<PopulatedDatabaseQuestion[]>} - Filtered list of questions
 */
export const filterQuestionsByBlocking = async (
  qlist: PopulatedDatabaseQuestion[],
  viewingUsername?: string,
): Promise<PopulatedDatabaseQuestion[]> => {
  if (!viewingUsername) {
    return qlist;
  }

  try {
    // Get the viewing user's blocked list
    const viewingUser = await UserModel.findOne({ username: viewingUsername });
    if (!viewingUser) {
      return qlist;
    }

    // Get all question authors and their blocked lists
    const authorUsernames = [...new Set(qlist.map(q => q.askedBy))];
    const authors = await UserModel.find({ username: { $in: authorUsernames } });
    const authorBlockedMap = new Map<string, string[]>();
    authors.forEach(author => {
      authorBlockedMap.set(author.username, author.blockedUsers || []);
    });

    // Filter questions based on blocking
    return qlist.filter(q => {
      // Filter if viewing user has blocked the question author
      if (viewingUser.blockedUsers && viewingUser.blockedUsers.includes(q.askedBy)) {
        return false;
      }

      // Filter if question author has blocked the viewing user
      const authorBlockedUsers = authorBlockedMap.get(q.askedBy) || [];
      if (authorBlockedUsers.includes(viewingUsername)) {
        return false;
      }

      return true;
    });
  } catch (error) {
    // If there's an error, return the original list
    return qlist;
  }
};

/**
 * Fetches a question by ID and increments its view count.
 * @param {string} qid - The question ID
 * @param {string} username - The username requesting the question
 * @returns {Promise<QuestionResponse | null>} - The question with incremented views or error message
 */
export const fetchAndIncrementQuestionViewsById = async (
  qid: string,
  username: string,
): Promise<PopulatedDatabaseQuestion | { error: string }> => {
  try {
    const q: PopulatedDatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: new ObjectId(qid) },
      { $addToSet: { views: username } },
      { new: true },
    ).populate<{
      tags: DatabaseTag[];
      answers: PopulatedDatabaseAnswer[];
      comments: DatabaseComment[];
      community: DatabaseCommunity;
    }>([
      { path: 'tags', model: TagModel },
      { path: 'answers', model: AnswerModel, populate: { path: 'comments', model: CommentModel } },
      { path: 'comments', model: CommentModel },
    ]);

    if (!q) {
      throw new Error('Question not found');
    }

    return q;
  } catch (error) {
    return { error: 'Error when fetching and updating a question' };
  }
};

/**
 * Saves a new question to the database.
 * @param {Question} question - The question to save
 * @returns {Promise<QuestionResponse>} - The saved question or error message
 */
export const saveQuestion = async (question: Question): Promise<QuestionResponse> => {
  try {
    const newQuestion = {
      ...question,
      interestedUsers: !question.interestedUsers ? [question.askedBy] : question.interestedUsers,
    };

    const allowed = question.community
      ? await isAllowedToPostInCommunity(question.community.toString(), question.askedBy)
      : true;

    if (!allowed) {
      throw new Error('Unauthorized: User cannot post question in this community');
    }

    const result: DatabaseQuestion = await QuestionModel.create(newQuestion);

    return result;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * Adds a vote to a question.
 * @param {string} qid - The question ID
 * @param {string} username - The username who voted
 * @param {'upvote' | 'downvote'} voteType - The vote type
 * @returns {Promise<VoteResponse>} - The updated vote result
 */
export const addVoteToQuestion = async (
  qid: string,
  username: string,
  voteType: 'upvote' | 'downvote',
): Promise<VoteResponse> => {
  let updateOperation: QueryOptions;

  if (voteType === 'upvote') {
    updateOperation = [
      {
        $set: {
          upVotes: {
            $cond: [
              { $in: [username, '$upVotes'] },
              { $filter: { input: '$upVotes', as: 'u', cond: { $ne: ['$$u', username] } } },
              { $concatArrays: ['$upVotes', [username]] },
            ],
          },
          downVotes: {
            $cond: [
              { $in: [username, '$upVotes'] },
              '$downVotes',
              { $filter: { input: '$downVotes', as: 'd', cond: { $ne: ['$$d', username] } } },
            ],
          },
        },
      },
    ];
  } else {
    updateOperation = [
      {
        $set: {
          downVotes: {
            $cond: [
              { $in: [username, '$downVotes'] },
              { $filter: { input: '$downVotes', as: 'd', cond: { $ne: ['$$d', username] } } },
              { $concatArrays: ['$downVotes', [username]] },
            ],
          },
          upVotes: {
            $cond: [
              { $in: [username, '$downVotes'] },
              '$upVotes',
              { $filter: { input: '$upVotes', as: 'u', cond: { $ne: ['$$u', username] } } },
            ],
          },
        },
      },
    ];
  }

  try {
    const before: DatabaseQuestion | null = await QuestionModel.findById({ _id: qid });

    if (!before) {
      return { error: 'Question not found!' };
    }

    const result: DatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: qid },
      updateOperation,
      { new: true },
    );

    if (!result) {
      return { error: 'Question not found!' };
    }

    // updates lifeUpvotes. handles for if previously downvoted is being upvoted | if prev upvoted is being downvoted

    let userUpdate: QueryOptions;

    if (voteType === 'upvote') {
      userUpdate = result.upVotes.includes(username)
        ? [
            {
              $set: {
                lifeUpvotes: {
                  $cond: {
                    if: before.downVotes.includes(username),
                    then: { $add: [2, '$lifeUpvotes'] },
                    else: { $add: [1, '$lifeUpvotes'] },
                  },
                },
              },
            },
          ]
        : [
            {
              $set: {
                lifeUpvotes: {
                  $subtract: ['$lifeUpvotes', 1],
                },
              },
            },
          ];
    } else {
      userUpdate = result.downVotes.includes(username)
        ? [
            {
              $set: {
                $cond: {
                  if: before.upVotes.includes(username),
                  then: { $subtract: [2, '$lifeUpvotes'] },
                  else: { $subtract: [1, '$lifeUpvotes'] },
                },
              },
            },
          ]
        : [
            {
              $set: {
                lifeUpvotes: {
                  $subtract: ['$lifeUpvotes', 1],
                },
              },
            },
          ];
    }

    const updatedUser: DatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      userUpdate,
      { new: true },
    );

    if (!updatedUser) {
      return { error: 'User lifetime upvotes failed to update!' };
    }

    let msg = '';

    if (voteType === 'upvote') {
      msg = result.upVotes.includes(username)
        ? 'Question upvoted successfully'
        : 'Upvote cancelled successfully';
    } else {
      msg = result.downVotes.includes(username)
        ? 'Question downvoted successfully'
        : 'Downvote cancelled successfully';
    }

    return {
      msg,
      upVotes: result.upVotes || [],
      downVotes: result.downVotes || [],
    };
  } catch (err) {
    return {
      error:
        voteType === 'upvote'
          ? 'Error when adding upvote to question'
          : 'Error when adding downvote to question',
    };
  }
};

/**
 * Fetches all questions in a community.
 *
 * @param communityId - The ID of the community to fetch questions from
 * @returns {Promise<DatabaseQuestion[]>} - The list of questions in the community
 */
export const getCommunityQuestions = async (communityId: string): Promise<DatabaseQuestion[]> => {
  try {
    const questions = await QuestionModel.find({ community: communityId });

    return questions;
  } catch (error) {
    return [];
  }
};

/**
 * Fetches a question by ID, adding user to interestedUsers if they weren't there and removing them if they were.
 * @param {string} qid - The question ID
 * @param {string} username - The username requesting the question
 * @returns {Promise<QuestionResponse | null>} - The question with updated or error message
 */
export const toggleUserInterest = async (
  qid: string,
  username: string,
): Promise<PopulatedDatabaseQuestion | { error: string }> => {
  try {
    const q: PopulatedDatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: new ObjectId(qid) },
      [
        {
          $set: {
            interestedUsers: {
              $cond: [
                { $ne: ['$interestedUsers', undefined] },
                {
                  $cond: {
                    if: { $in: [username, '$interestedUsers'] },
                    then: {
                      $setDifference: ['$interestedUsers', [username]],
                    },
                    else: { $concatArrays: ['$interestedUsers', [username]] },
                  },
                },
                [username],
              ],
            },
          },
        },
      ],
      { new: true },
    );

    if (!q) {
      throw new Error('Question not found');
    }

    return q;
  } catch (error) {
    return { error: 'Error when fetching and updating interested users' };
  }
};

export const isAllowedToPostOnQuestion = async (
  questionId: string,
  username: string,
): Promise<boolean> => {
  const question = await QuestionModel.findById(questionId).select('community');

  if (!question) {
    throw new Error('Question not found');
  }

  const isAllowed = question.community
    ? await isAllowedToPostInCommunity(question.community.toString(), username)
    : true;

  return isAllowed;
};
