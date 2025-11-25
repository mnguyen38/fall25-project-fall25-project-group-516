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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowDown,
  faBell,
  faCheck,
  faComment,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Interface represents the props for the VoteComponent.
 *
 * question - The question object containing voting information.
 * commentCount - The number of comments.
 * onToggleComments - Function to toggle comments visibility.
 * showComments - Whether comments are currently shown.
 */
interface VoteComponentProps {
  question: PopulatedDatabaseQuestion;
  commentCount?: number;
  onToggleComments?: () => void;
  showComments?: boolean;
}

/**
 * A Vote component that allows users to upvote or downvote a question or add themselves as interested (will recieve notifactions upon question update).
 *
 * @param question - The question object containing voting information.
 * @param commentCount - The number of comments.
 * @param onToggleComments - Function to toggle comments visibility.
 * @param showComments - Whether comments are currently shown.
 */
const VoteComponent = ({
  question,
  commentCount = 0,
  onToggleComments,
  showComments = false,
}: VoteComponentProps) => {
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
        <button
          className={`vote-button upvote ${voted === 1 ? 'vote-button-upvoted' : ''}`}
          onClick={() => handleVote('upvote')}
          title='Upvote'>
          <FontAwesomeIcon icon={faArrowUp} />
          <span className='vote-count'>{count}</span>
        </button>
        <button
          className={`vote-button downvote ${voted === -1 ? 'vote-button-downvoted' : ''}`}
          onClick={() => handleVote('downvote')}
          title='Downvote'>
          <FontAwesomeIcon icon={faArrowDown} />
        </button>
        {onToggleComments && (
          <button
            className={`action-button ${showComments ? 'active-comments' : ''}`}
            onClick={onToggleComments}
            title={showComments ? 'Hide comments' : 'Show comments'}>
            <FontAwesomeIcon icon={faComment} />
            <span className='action-text'>{commentCount}</span>
          </button>
        )}
        <button
          className={`action-button ${interested ? 'interested' : ''}`}
          onClick={handleClickNotify}
          title={interested ? 'You will be notified of new answers' : 'Notify me'}>
          <FontAwesomeIcon icon={interested ? faCheck : faBell} />
          <span className='action-text'>{interested ? 'Subscribed' : 'Notify'}</span>
        </button>
      </div>
    </div>
  );
};

export default VoteComponent;
