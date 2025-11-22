import './index.css';
import OrderButton from './orderButton';
import { OrderType } from '../../../../types/types';
import { orderTypeDisplayName } from '../../../../types/constants';
import AskQuestionButton from '../../askQuestionButton';

/**
 * Interface representing the props for the QuestionHeader component.
 *
 * titleText - The title text displayed at the top of the header.
 * qcnt - The number of questions to be displayed in the header.
 * setQuestionOrder - A function that sets the order of questions based on the selected message.
 * collectionEditMode - Boolean indicating if collection edit mode is active.
 * setCollectionEditMode - Function to toggle collection edit mode.
 */
interface QuestionHeaderProps {
  titleText: string;
  qcnt: number;
  setQuestionOrder: (order: OrderType) => void;
  collectionEditMode: boolean;
  setCollectionEditMode: (mode: boolean) => void;
}

/**
 * QuestionHeader component displays the header section for a list of questions.
 * It includes the title, a button to ask a new question, the number of the quesions,
 * and buttons to set the order of questions.
 *
 * @param titleText - The title text to display in the header.
 * @param qcnt - The number of questions displayed in the header.
 * @param setQuestionOrder - Function to set the order of questions based on input message.
 * @param collectionEditMode - Boolean indicating if collection edit mode is active.
 * @param setCollectionEditMode - Function to toggle collection edit mode.
 */
const QuestionHeader = ({
  titleText,
  qcnt,
  setQuestionOrder,
  collectionEditMode,
  setCollectionEditMode,
}: QuestionHeaderProps) => (
  <div>
    <div className='space_between right_padding'>
      <div className='bold_title'>{titleText}</div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          className={`collection-edit-toggle ${collectionEditMode ? 'active' : ''}`}
          onClick={() => setCollectionEditMode(!collectionEditMode)}
          title={
            collectionEditMode
              ? 'Exit collection edit mode'
              : 'Enter collection edit mode - click questions to add to collections'
          }>
          {collectionEditMode ? '✓ Collection Edit Mode' : 'Edit My Collections'}
        </button>
        <AskQuestionButton />
      </div>
    </div>
    <div className='space_between right_padding'>
      <div id='question_count'>{qcnt} questions</div>
      <div className='btns'>
        {Object.keys(orderTypeDisplayName).map(order => (
          <OrderButton
            key={order}
            orderType={order as OrderType}
            setQuestionOrder={setQuestionOrder}
          />
        ))}
      </div>
    </div>
  </div>
);

export default QuestionHeader;
