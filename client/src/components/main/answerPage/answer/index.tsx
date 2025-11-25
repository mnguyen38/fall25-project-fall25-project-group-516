import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CommentSection from '../../commentSection';
import './index.css';
import { Comment, DatabaseComment } from '../../../../types/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

/**
 * Interface representing the props for the AnswerView component.
 *
 * - text The content of the answer.
 * - ansBy The username of the user who wrote the answer.
 * - meta Additional metadata related to the answer.
 * - comments An array of comments associated with the answer.
 * - handleAddComment Callback function to handle adding a new comment.
 */
interface AnswerProps {
  text: string;
  ansBy: string;
  meta: string;
  comments: DatabaseComment[];
  handleAddComment: (comment: Comment) => void;
}

/**
 * AnswerView component that displays the content of an answer with the author's name and metadata.
 * The answer text is processed to handle hyperlinks, and a comment section is included.
 *
 * @param text The content of the answer.
 * @param ansBy The username of the answer's author.
 * @param meta Additional metadata related to the answer.
 * @param comments An array of comments associated with the answer.
 * @param handleAddComment Function to handle adding a new comment.
 */
const AnswerView = ({ text, ansBy, meta, comments, handleAddComment }: AnswerProps) => {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className='answer-container right_padding'>
      <div className='answer'>
        <div id='answerText' className='answerText'>
          {<Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>}
        </div>
        <div className='answerAuthor'>
          <div className='answer_author'>{ansBy}</div>
          <div className='answer_question_meta'>{meta}</div>
        </div>
      </div>
      <div className='answer-comment-button-container'>
        <button
          className={`action-button ${showComments ? 'active-comments' : ''}`}
          onClick={() => setShowComments(!showComments)}
          title={showComments ? 'Hide comments' : 'Show comments'}>
          <FontAwesomeIcon icon={faComment} />
          <span className='action-text'>{comments.length}</span>
        </button>
      </div>
      <CommentSection
        comments={comments}
        handleAddComment={handleAddComment}
        externalShowComments={showComments}
        onToggleComments={setShowComments}
      />
    </div>
  );
};

export default AnswerView;
