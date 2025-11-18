import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { AnswerUpdatePayload, OrderType, PopulatedDatabaseQuestion } from '../types/types';
import { getQuestionsByFilter } from '../services/questionService';
import { getAuthToken } from '../utils/auth';
import { getLoginStatus, setLoginStatus } from '../utils/login';

/**
 * Custom hook for managing the question page state, filtering, and real-time updates.
 *
 * @returns titleText - The current title of the question page
 * @returns qlist - The list of questions to display
 * @returns setQuestionOrder - Function to set the sorting order of questions (e.g., newest, oldest).
 */
const useQuestionPage = () => {
  const { user, socket } = useUserContext();

  const [searchParams] = useSearchParams();
  const [titleText, setTitleText] = useState<string>('All Questions');
  const [search, setSearch] = useState<string>('');
  const [questionOrder, setQuestionOrder] = useState<OrderType>('newest');
  const [qlist, setQlist] = useState<PopulatedDatabaseQuestion[]>([]);
  const [showLoginReward, setShowLoginReward] = useState(false);
  const [loginReward, setLoginReward] = useState<number>(0);
  const [loginStreak, setLoginStreak] = useState(0);

  /**
   * If it is user's first login of session, opens transaction window for login reward.
   */
  useEffect(() => {
    if (getAuthToken() && !getLoginStatus(user.username)) {
      let reward: number;
      if (user.loginStreak) {
        reward = user.loginStreak % 7 == 0 ? 10 : user.loginStreak % 7;
        setLoginStreak(user.loginStreak);
      } else {
        // first time login
        reward = 5;
      }
      setLoginReward(reward);
      setShowLoginReward(true);
    }
  }, [user.loginStreak, user.username]);

  /**
   * When user claims login reward, sets login status in session storage.
   * This ensures that the next time they log in during the session, they won't get a duplicate reward.
   */
  const loginClaimed = () => {
    setLoginStatus(user.username);
  };

  useEffect(() => {
    let pageTitle = 'All Questions';
    let searchString = '';

    const searchQuery = searchParams.get('search');
    const tagQuery = searchParams.get('tag');

    if (searchQuery) {
      pageTitle = 'Search Results';
      searchString = searchQuery;
    } else if (tagQuery) {
      pageTitle = tagQuery;
      searchString = `[${tagQuery}]`;
    }

    setTitleText(pageTitle);
    setSearch(searchString);
  }, [searchParams]);

  useEffect(() => {
    /**
     * Function to fetch questions based on the filter and update the question list.
     */
    const fetchData = async () => {
      try {
        const res = await getQuestionsByFilter(questionOrder, search);
        setQlist(res || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };

    /**
     * Function to handle question updates from the socket.
     *
     * @param question - the updated question object.
     */
    const handleQuestionUpdate = (question: PopulatedDatabaseQuestion) => {
      setQlist(prevQlist => {
        const questionExists = prevQlist.some(q => q._id === question._id);

        if (questionExists) {
          // Update the existing question
          return prevQlist.map(q => (q._id === question._id ? question : q));
        }

        return [question, ...prevQlist];
      });
    };

    /**
     * Function to handle answer updates from the socket.
     *
     * @param qid - The question ID.
     * @param answer - The answer object.
     */
    const handleAnswerUpdate = ({ qid, answer }: AnswerUpdatePayload) => {
      setQlist(prevQlist =>
        prevQlist.map(q => (q._id === qid ? { ...q, answers: [...q.answers, answer] } : q)),
      );
    };

    /**
     * Function to handle views updates from the socket.
     *
     * @param question - The updated question object.
     */
    const handleViewsUpdate = (question: PopulatedDatabaseQuestion) => {
      setQlist(prevQlist => prevQlist.map(q => (q._id === question._id ? question : q)));
    };

    fetchData();

    socket.on('questionUpdate', handleQuestionUpdate);
    socket.on('answerUpdate', handleAnswerUpdate);
    socket.on('viewsUpdate', handleViewsUpdate);

    return () => {
      socket.off('questionUpdate', handleQuestionUpdate);
      socket.off('answerUpdate', handleAnswerUpdate);
      socket.off('viewsUpdate', handleViewsUpdate);
    };
  }, [questionOrder, search, socket]);

  return {
    titleText,
    qlist,
    setQuestionOrder,
    showLoginReward,
    setShowLoginReward,
    loginReward,
    loginStreak,
    loginClaimed,
  };
};

export default useQuestionPage;
