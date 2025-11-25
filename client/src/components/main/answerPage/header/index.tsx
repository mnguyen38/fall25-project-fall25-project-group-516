import './index.css';

/**
 * Interface representing the props for the AnswerHeader component.
 *
 * - ansCount - The number of answers to display in the header (kept for compatibility).
 * - title - The title of the question or discussion thread.
 */
interface AnswerHeaderProps {
  ansCount: number;
  title: string;
}

/**
 * AnswerHeader component that displays a header section for the answer page.
 * It includes the question title centered at the top.
 *
 * @param ansCount The number of answers (unused, kept for compatibility).
 * @param title The title of the question or discussion thread.
 */
const AnswerHeader = ({ title }: AnswerHeaderProps) => (
  <div id='answersHeader' className='answer-header-container'>
    <h1 className='question-title'>{title}</h1>
  </div>
);

export default AnswerHeader;
