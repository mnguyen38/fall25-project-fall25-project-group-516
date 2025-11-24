import {
  downvoteQuestion,
  toggleUserInterestInQuestion,
  upvoteQuestion,
} from '../../../services/questionService';
import './index.css';
import useUserContext from '../../../hooks/useUserContext';
import { PopulatedDatabaseQuestion } from '../../../types/types';
import useVoteStatus from '../../../hooks/useVoteStatus';
import useUserInterest from '../../../hooks/useUserInterest';
import { useState } from 'react';

/**
 * Interface represents the props for the VoteComponent.
 *
 * question - The question object containing voting information.
 */
interface VoteComponentProps {
  question: PopulatedDatabaseQuestion;
}

/**
 * A Vote component that allows users to upvote or downvote a question or add themselves as interested (will recieve notifactions upon question update).
 *
 * @param question - The question object containing voting information.
 */
const VoteComponent = ({ question }: VoteComponentProps) => {
  const { user } = useUserContext();
  const { count, voted } = useVoteStatus({ question });

  const { interested, setInterested } = useUserInterest({ question });

  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Function to handle upvoting or downvoting a question.
   *
   * @param type - The type of vote, either 'upvote' or 'downvote'.
   */
  const handleVote = async (type: string) => {
    try {
      if (question._id) {
        if (type === 'upvote') {
          await upvoteQuestion(question._id, user.username);
        } else if (type === 'downvote') {
          await downvoteQuestion(question._id, user.username);
        }
      }
    } catch (error) {
      // Handle error
    }
  };

  /**
   * When user clicks "notify me" button, adds them to interestedUser list for that question.
   */
  const handleClickNotify = async () => {
    try {
      const updatedQuestion = await toggleUserInterestInQuestion(question._id, user.username);
      if (!updatedQuestion) {
        throw Error('User did not update');
      }
      setInterested(updatedQuestion.interestedUsers.includes(user.username));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Error while updating interest in question');
    }
  };

  return (
    <div>
      {errorMessage && <div className='error-message'>{errorMessage}</div>}
      <div className='vote-interest-container'>
        <div className='vote-container'>
          <button
            className={`vote-button ${voted === 1 ? 'vote-button-upvoted' : ''}`}
            onClick={() => handleVote('upvote')}>
            Upvote
          </button>
          <button
            className={`vote-button ${voted === -1 ? 'vote-button-downvoted' : ''}`}
            onClick={() => handleVote('downvote')}>
            Downvote
          </button>
          <span className='vote-count'>{count}</span>
        </div>
        <div className='interest-container'>
          <button
            className={`interest-button ${interested ? 'interested' : ''}`}
            onClick={handleClickNotify}>
            {interested
              ? 'You will be notified when this question recieves new answers'!
              : 'Notify me'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteComponent;
