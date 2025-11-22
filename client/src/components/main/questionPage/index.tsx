import './index.css';
import { useState } from 'react';
import QuestionHeader from './header';
import QuestionView from './question';
import useQuestionPage from '../../../hooks/useQuestionPage';
import SaveToCollectionModal from '../collections/saveToCollectionModal';
import { PopulatedDatabaseQuestion } from '../../../types/types';

/**
 * QuestionPage component renders a page displaying a list of questions
 * based on filters such as order and search terms.
 * It includes a header with order buttons and a button to ask a new question.
 */
const QuestionPage = () => {
  const { titleText, qlist, setQuestionOrder } = useQuestionPage();

  const [collectionEditMode, setCollectionEditMode] = useState(false);
  const [isCollectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<PopulatedDatabaseQuestion | null>(null);

  const handleQuestionClick = (question: PopulatedDatabaseQuestion) => {
    if (collectionEditMode) {
      setSelectedQuestion(question);
      setCollectionModalOpen(true);
    }
  };

  const closeCollectionModal = () => {
    setSelectedQuestion(null);
    setCollectionModalOpen(false);
  };

  return (
    <>
      <QuestionHeader
        titleText={titleText}
        qcnt={qlist.length}
        setQuestionOrder={setQuestionOrder}
        collectionEditMode={collectionEditMode}
        setCollectionEditMode={setCollectionEditMode}
      />
      <div id='question_list' className='question_list'>
        {qlist.map(q => (
          <QuestionView
            question={q}
            key={q._id.toString()}
            collectionEditMode={collectionEditMode}
            onCollectionClick={handleQuestionClick}
          />
        ))}
      </div>

      {titleText === 'Search Results' && !qlist.length && (
        <div className='bold_title right_padding'>No Questions Found</div>
      )}

      {/* Collection Modal */}
      {isCollectionModalOpen && selectedQuestion && (
        <SaveToCollectionModal question={selectedQuestion} onClose={closeCollectionModal} />
      )}
    </>
  );
};

export default QuestionPage;
