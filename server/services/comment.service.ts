import {
  AnswerResponse,
  Comment,
  CommentResponse,
  DatabaseAnswer,
  DatabaseComment,
  DatabaseQuestion,
  QuestionResponse,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import CommentModel from '../models/comments.model';
import { isAllowedToPostOnQuestion } from './question.service';
import { isAllowedToPostOnAnswer } from './answer.service';
import { getUserIfTopContributor } from './user.service';

/**
 * Saves a new comment to the database.
 * @param {Comment} comment - The comment to save.
 * @returns {Promise<CommentResponse>} - The saved comment or an error message.
 */
export const saveComment = async (comment: Comment): Promise<CommentResponse> => {
  try {
    const commenter = await getUserIfTopContributor(comment.commentBy);
    let newComment;
    if (!commenter || 'error' in commenter) {
      newComment = comment;
    } else {
      newComment = {
        ...comment,
        topContributor: true,
      };
    }
    const result: DatabaseComment = await CommentModel.create(newComment);
    return result;
  } catch (error) {
    return { error: 'Error when saving a comment' };
  }
};

/**
 * Adds a comment to a question or answer.
 * @param {string} id - The ID of the question or answer.
 * @param {'question' | 'answer'} type - The type of the item to comment on.
 * @param {DatabaseComment} comment - The comment to add.
 * @returns {Promise<QuestionResponse | AnswerResponse>} - The updated item or an error message.
 */
export const addComment = async (
  id: string,
  type: 'question' | 'answer',
  comment: DatabaseComment,
): Promise<QuestionResponse | AnswerResponse> => {
  try {
    if (!comment || !comment.text || !comment.commentBy || !comment.commentDateTime) {
      throw new Error('Invalid comment');
    }

    let result: DatabaseQuestion | DatabaseAnswer | null;

    if (type === 'question') {
      const isAllowed = await isAllowedToPostOnQuestion(id, comment.commentBy);
      if (!isAllowed) {
        throw new Error('Unauthorized: User not allowed to comment');
      }
      result = await QuestionModel.findOneAndUpdate(
        { _id: id },
        { $push: { comments: { $each: [comment._id] } } },
        { new: true },
      );
    } else {
      const isAllowed = await isAllowedToPostOnAnswer(id, comment.commentBy);
      if (!isAllowed) {
        throw new Error('User not allowed to comment');
      }
      result = await AnswerModel.findOneAndUpdate(
        { _id: id },
        { $push: { comments: { $each: [comment._id] } } },
        { new: true },
      );
    }

    if (result === null) {
      throw new Error('Failed to add comment');
    }

    return result;
  } catch (error) {
    return { error: `Error when adding comment: ${(error as Error).message}` };
  }
};
