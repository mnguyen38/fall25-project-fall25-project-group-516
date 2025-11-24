import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { PopulatedDatabaseQuestion } from '../types/types';

/**
 * Custom hook to handle updates to interest status.
 */
const useUserInterest = ({ question }: { question: PopulatedDatabaseQuestion }) => {
  const { user } = useUserContext();
  const [interested, setInterested] = useState<boolean>(false);

  /**
   * When question changes reasses interest status.
   */
  useEffect(() => {
    const getInterested = () => {
      if (question.interestedUsers.includes(user.username)) {
        return true;
      } else {
        return false;
      }
    };

    setInterested(getInterested());
  }, [user.username, question]);

  return { interested, setInterested };
};

export default useUserInterest;
