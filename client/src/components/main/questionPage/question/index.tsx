import './index.css';
import { getMetaData } from '../../../../tool';
import { PopulatedDatabaseQuestion } from '../../../../types/types';
import useQuestionView from '../../../../hooks/useQuestionView';

/**
 * Interface representing the props for the Question component.
 *
 * question - The question object containing details about the question.
 * collectionEditMode - Boolean indicating if collection edit mode is active.
 * onCollectionClick - Function to handle collection modal opening.
 */
interface QuestionProps {
  question: PopulatedDatabaseQuestion;
  collectionEditMode: boolean;
  onCollectionClick: (question: PopulatedDatabaseQuestion) => void;
}

/**
 * Question component renders the details of a question including its title, tags, author, answers, and views.
 * Clicking on the component triggers navigation to the question page or opens collection modal.
 * Tag clicks trigger the clickTag function.
 *
 * @param question - The question object containing question details.
 * @param collectionEditMode - Boolean indicating if collection edit mode is active.
 * @param onCollectionClick - Function to handle collection modal opening.
 */
const QuestionView = ({ question, collectionEditMode, onCollectionClick }: QuestionProps) => {
  const { clickTag, handleAnswer } = useQuestionView();

  const handleQuestionClick = () => {
    if (collectionEditMode) {
      onCollectionClick(question);
    } else if (question._id) {
      handleAnswer(question._id);
    }
  };

  return (
    <div
      className={`question right_padding ${collectionEditMode ? 'collection-edit-mode' : ''}`}
      onClick={handleQuestionClick}
      style={{ cursor: 'pointer' }}>
      <div className='postStats'>
        <div>{question.answers.length || 0} answers</div>
        <div>{question.views.length} views</div>
      </div>
      <div className='question_mid'>
        <div className='postTitle'>{question.title}</div>
        <div className='question_tags'>
          {question.tags.map(tag => (
            <button
              key={String(tag._id)}
              className='question_tag_button'
              onClick={e => {
                e.stopPropagation();
                clickTag(tag.name);
              }}>
              {tag.name}
            </button>
          ))}
        </div>
      </div>
      <div className='lastActivity'>
        <div className='question_author'>
          {question.isAnonymous
            ? 'Anonymous'
            : question.premiumStatus
              ? `${question.askedBy}\u{1F31F}`
              : question.askedBy}
        </div>
        <div>&nbsp;</div>
        <div className='question_meta'>asked {getMetaData(new Date(question.askDateTime))}</div>
      </div>

      {collectionEditMode && (
        <div className='collection-mode-indicator'>Click to add to collection</div>
      )}
    </div>
  );
};

export default QuestionView;
