import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import useCommunityPage from '../../hooks/useCommunityPage';
import CommunityMembershipButton from '../main/communities/communityMembershipButton';
import ReportUserModal from '../main/communities/reportUserModal';
import './index.css';
import { FiShield } from 'react-icons/fi';

/**
 * Sidebar component for community pages showing community info, members, and mod tools
 */
const CommunitySidebar = () => {
  const { community, username, handleDashboardRedirect } = useCommunityPage();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedUser, setReportedUser] = useState<string>('');

  const handleReportUser = (usernameToReport: string) => {
    setReportedUser(usernameToReport);
    setReportModalOpen(true);
  };

  if (!community) {
    return null;
  }

  return (
    <>
      <div className='community-sidebar'>
        <h2 className='community-title'>{community.name}</h2>
        <p className='community-description'>{community.description}</p>

        {community.admin !== username && <CommunityMembershipButton community={community} />}

        {(community.admin === username || community.moderators?.includes(username)) && (
          <button className='mod-tools-trigger-btn' onClick={() => handleDashboardRedirect()}>
            <FiShield size={20} />
            Manage Community
          </button>
        )}

        <div className='community-members'>
          <h3 className='section-heading'>Members ({community.participants.length})</h3>
          <p className='members-stats'>
            Premium: {community.premiumCount ?? 0} | Non-Premium: {community.nonPremiumCount ?? 0}
          </p>
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

export default CommunitySidebar;
