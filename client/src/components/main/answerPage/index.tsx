import { getMetaData } from '../../../tool';
import AnswerView from './answer';
import AnswerHeader from './header';
import { Comment } from '../../../types/types';
import './index.css';
import QuestionBody from './questionBody';
import VoteComponent from '../voteComponent';
import CommentSection from '../commentSection';
import useAnswerPage from '../../../hooks/useAnswerPage';
import useUserContext from '../../../hooks/useUserContext';
import AskQuestionButton from '../askQuestionButton';
import { useState } from 'react';

/**
 * AnswerPage component that displays the full content of a question along with its answers.
 * It also includes the functionality to vote, ask a new question, and post a new answer.
 */
const AnswerPage = () => {
  const { questionID, question, handleNewComment, handleNewAnswer } = useAnswerPage();
  const { user } = useUserContext();
  const [showQuestionComments, setShowQuestionComments] = useState(false);

  if (!question) {
    return null;
  }

  // Filter out answers from blocked users
  const filteredAnswers = question.answers.filter(a => {
    if (!user?.blockedUsers || user.blockedUsers.length === 0) return true;
    return !user.blockedUsers.includes(a.ansBy);
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <AskQuestionButton />
      </div>
      <AnswerHeader ansCount={filteredAnswers.length} title={question.title} />
      <QuestionBody
        ansCount={filteredAnswers.length}
        views={question.views.length}
        text={question.text}
        askby={question.isAnonymous ? 'Anonymous' : question.askedBy}
        meta={getMetaData(new Date(question.askDateTime))}
      />
      <VoteComponent
        question={question}
        commentCount={question.comments.length}
        onToggleComments={() => setShowQuestionComments(!showQuestionComments)}
        showComments={showQuestionComments}
      />
      <CommentSection
        comments={question.comments}
        handleAddComment={(comment: Comment) => handleNewComment(comment, 'question', questionID)}
        externalShowComments={showQuestionComments}
        onToggleComments={setShowQuestionComments}
      />
      <button
        className='bluebtn ansButton'
        onClick={() => {
          handleNewAnswer();
        }}
        style={{ marginTop: '16px', marginBottom: '24px' }}>
        Answer Question
      </button>
      {filteredAnswers.map(a => (
        <AnswerView
          key={String(a._id)}
          text={a.text}
          ansBy={a.ansBy}
          meta={getMetaData(new Date(a.ansDateTime))}
          comments={a.comments}
          handleAddComment={(comment: Comment) =>
            handleNewComment(comment, 'answer', String(a._id))
          }
        />
      ))}
    </>
  );
};

export default AnswerPage;
