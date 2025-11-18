import useCommunityPage from '../../../../hooks/useCommunityPage';
import QuestionView from '../../questionPage/question';
import CommunityMembershipButton from '../communityMembershipButton';
import './index.css';
import ModToolsModal from '../modToolsModal';

/**
 * This component displays the details of a specific community, including its name, description,
 * members, and questions.
 */
const CommunityPage = () => {
  const { community, communityQuestions, isModalOpen, setIsModalOpen, username } =
    useCommunityPage();

  if (!community) {
    return <div className='loading'>Loading...</div>;
  }

  return (
    <>
      <div className='community-page-layout'>
        <main className='questions-section'>
          <h3 className='section-heading'>Questions</h3>
          {communityQuestions.map(q => (
            <QuestionView question={q} key={q._id.toString()} />
          ))}
        </main>

        <div className='community-sidebar'>
          <h2 className='community-title'>{community.name}</h2>
          <p className='community-description'>{community.description}</p>

          {community.admin !== username && <CommunityMembershipButton community={community} />}

          {community.admin === username && (
            <button className='mod-tools-trigger-btn' onClick={() => setIsModalOpen(true)}>
              🛠️ Mod Tools
            </button>
          )}

          <div className='community-members'>
            <h3 className='section-heading'>Members</h3>
            <ul className='members-list'>
              {community?.participants.map(participantUsername => {
                const isAdmin = community.admin === participantUsername;
                const isModerator = !isAdmin && community.moderators?.includes(participantUsername);

                return (
                  <li
                    key={participantUsername}
                    className={`member-item ${isAdmin ? 'admin-member' : ''} ${isModerator ? 'mod-member' : ''}`}>
                    {isAdmin && <span className='role-badge admin-badge'>Admin</span>}
                    {isModerator && <span className='role-badge mod-badge'>Mod</span>}

                    <span className='username'>{participantUsername}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {isModalOpen && <ModToolsModal community={community} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default CommunityPage;
