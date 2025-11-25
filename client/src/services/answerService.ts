import { Answer, DatabaseAnswer, PopulatedDatabaseAnswer } from '../types/types';
import api from './config';

const ANSWER_API_URL = `/api/answer`;

/**
 * Adds a new answer to a specific question.
 *
 * @param qid - The ID of the question to which the answer is being added.
 * @param ans - The answer object containing the answer details.
 * @throws Error Throws an error if the request fails or the response status is not 200.
 */
const addAnswer = async (qid: string, ans: Answer): Promise<PopulatedDatabaseAnswer> => {
  const data = { qid, ans };

  try {
    const res = await api.post(`${ANSWER_API_URL}/addAnswer`, data);
    if (res.status !== 200) {
      throw new Error('Error while creating a new answer');
    }
    return res.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { error?: string } } };
      if (axiosError.response?.status === 403) {
        const errorMessage = axiosError.response.data?.error;
        if (errorMessage?.includes('not allowed')) {
          throw new Error(
            'You are not allowed to answer this question. You may be blocked from this community.',
          );
        }
        throw new Error('You do not have permission to answer this question.');
      }
    }
    throw new Error('Error while creating a new answer');
  }
};

/**
 * Retrieves all answers created by a specific user.
 *
 * @param username - The username of the user whose answers to retrieve.
 * @returns Promise resolving to an array of answers.
 * @throws Error Throws an error if the request fails or the response status is not 200.
 */
export const getAnswersByUser = async (username: string): Promise<DatabaseAnswer[]> => {
  const res = await api.get(`${ANSWER_API_URL}/user/${username}`);
  if (res.status !== 200) {
    throw new Error('Error while fetching answers by user');
  }
  return res.data;
};

export default addAnswer;
