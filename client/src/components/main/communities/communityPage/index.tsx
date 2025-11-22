import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import useCommunityPage from '../../../../hooks/useCommunityPage';
import QuestionView from '../../questionPage/question';
import CommunityMembershipButton from '../communityMembershipButton';
import './index.css';
import ModToolsModal from '../modToolsModal';
import ReportUserModal from '../reportUserModal';

/**
 * This component displays the details of a specific community, including its name, description,
 * members, and questions.
 */
const CommunityPage = () => {
  const { community, communityQuestions, isModalOpen, setIsModalOpen, username } =
    useCommunityPage();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedUser, setReportedUser] = useState<string>('');

  const handleReportUser = (usernameToReport: string) => {
    setReportedUser(usernameToReport);
    setReportModalOpen(true);
  };

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

                    {username &&
                      username !== participantUsername &&
                      !isAdmin &&
                      !isModerator &&
                      community.participants.includes(username) && (
                        <button
                          className='report-button'
                          onClick={() => handleReportUser(participantUsername)}
                          title={`Report ${participantUsername}`}
                          aria-label={`Report ${participantUsername}`}
                          type='button'>
                          <FontAwesomeIcon icon={faFlag} />
                        </button>
                      )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {isModalOpen && <ModToolsModal community={community} onClose={() => setIsModalOpen(false)} />}
      {reportModalOpen && username && (
        <ReportUserModal
          communityId={community._id.toString()}
          reportedUsername={reportedUser}
          reporterUsername={username}
          onClose={() => setReportModalOpen(false)}
          onSuccess={() => {
            // Optionally refresh community data or show success message
          }}
        />
      )}
    </>
  );
};

export default CommunityPage;
