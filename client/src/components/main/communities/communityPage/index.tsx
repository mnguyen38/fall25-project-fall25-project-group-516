import useCommunityPage from '../../../../hooks/useCommunityPage';
import QuestionView from '../../questionPage/question';
import './index.css';

/**
 * This component displays the questions for a specific community.
 * The community sidebar is now rendered in the Layout component.
 */
const CommunityPage = () => {
  const { community, communityQuestions } = useCommunityPage();

  if (!community) {
    return <div className='loading'>Loading...</div>;
  }

  return (
    <>
      <div className='community-page-layout'>
        <main className='questions-section'>
          <h3 className='section-heading'>Questions</h3>
          {communityQuestions.map(q => (
            <QuestionView
              question={q}
              key={q._id.toString()}
              collectionEditMode={false}
              onCollectionClick={() => {}}
            />
          ))}
        </main>
      </div>
    </>
  );
};

export default CommunityPage;
