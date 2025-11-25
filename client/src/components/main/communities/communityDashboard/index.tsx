// index.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBarChart2,
  FiUsers,
  FiAlertCircle,
  FiArrowLeft,
  FiSearch,
  FiCheckCircle,
  FiTrash2,
  FiRadio,
} from 'react-icons/fi';
import './index.css';
import { DatabaseAppeal } from '@fake-stack-overflow/shared';
import { Notification } from '@fake-stack-overflow/shared/types/notification';
import useCommunityDashboard from '../../../../hooks/useCommunityDashboard';
import { sendAnnouncement, deleteCommunity } from '../../../../services/communityService';
import useUserContext from '../../../../hooks/useUserContext';

const CommunityDashboard = () => {
  const {
    community,
    appeals,
    error,
    actionError,
    userSearchQuery,
    foundUsers,
    handleQueryChange,
    handleToggleBan,
    handleToggleMute,
    handleToggleModerator,
    handleUpdateAppealStatus,
    refreshDashboard,
  } = useCommunityDashboard();

  const { user } = useUserContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'appeals' | 'announcements'>(
    'overview',
  );

  // Announcement State
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [announcementStatus, setAnnouncementStatus] = useState<string>('');

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Determine if appeals data is valid and has items
  const hasAppeals = appeals && Array.isArray(appeals) && appeals.length > 0;

  const handleSendAnnouncement = async () => {
    setAnnouncementStatus('');
    if (!announcementTitle.trim() || !announcementMsg.trim()) {
      setAnnouncementStatus('Title and message are required.');
      return;
    }

    if (!community) return;

    const notification: Notification = {
      title: announcementTitle,
      msg: announcementMsg,
      dateTime: new Date(),
      sender: user.username,
      contextId: community._id,
      type: 'community',
    };

    try {
      await sendAnnouncement(community._id.toString(), user.username, notification);
      setAnnouncementStatus('Announcement sent successfully!');
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      setTimeout(() => setAnnouncementStatus(''), 3000);
    } catch (e) {
      setAnnouncementStatus('Failed to send announcement.');
    }
  };

  const handleDeleteCommunity = async () => {
    setDeleteError(null);
    if (community && community.admin === user.username) {
      try {
        await deleteCommunity(community._id.toString(), user.username);
        navigate('/communities');
      } catch (e: unknown) {
        setDeleteError((e as Error).message || 'Failed to delete community');
      }
    }
  };

  if (error) {
    return (
      <div className='dashboard-error-container'>
        <h2>Access Denied or Error</h2>
        <p>{error}</p>
        <button className='nav-item return-btn' onClick={() => navigate('/home')}>
          Return Home
        </button>
      </div>
    );
  }

  if (!community) {
    return <div className='loading'>Loading Dashboard...</div>;
  }

  const isAdmin = community.admin === user.username;

  return (
    <div className='dashboard-container'>
      {/* Sidebar */}
      <aside className='dashboard-sidebar'>
        <div className='dashboard-sidebar-header'>
          <h3 className='community-name'>{community.name}</h3>
          <span className='dashboard-badge'>MOD VIEW</span>
        </div>

        <nav className='dashboard-nav'>
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}>
            <div className='nav-item-content'>
              <FiBarChart2 className='nav-icon' />
              <span>Overview</span>
            </div>
          </button>

          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}>
            <div className='nav-item-content'>
              <FiUsers className='nav-icon' />
              <span>User Management</span>
            </div>
          </button>

          <button
            className={`nav-item ${activeTab === 'appeals' ? 'active' : ''}`}
            onClick={() => setActiveTab('appeals')}>
            <div className='nav-item-content'>
              <FiAlertCircle className='nav-icon' />
              <span>Appeals</span>
            </div>
            {hasAppeals && <span className='notification-pill'>{appeals.length}</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}>
            <div className='nav-item-content'>
              <FiRadio className='nav-icon' />
              <span>Announcements</span>
            </div>
          </button>

          <button
            className='nav-item return-btn'
            onClick={() => navigate(`/communities/${community._id}`)}>
            <FiArrowLeft className='nav-icon' />
            <span>Back to Community</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className='dashboard-content'>
        {/* Action Error Banner */}
        {actionError && (
          <div className='error-banner'>
            <span>⚠️ {actionError}</span>
            <button className='refresh-link' onClick={() => refreshDashboard()}>
              Refresh data
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className='dashboard-section fade-in'>
            <h2 className='section-title'>Dashboard Overview</h2>
            <div className='stats-grid'>
              <div className='stat-card'>
                <h4 className='stat-label'>TOTAL MEMBERS</h4>
                <div className='stat-value'>{community.participants.length}</div>
              </div>
              <div className='stat-card'>
                <h4 className='stat-label'>PENDING APPEALS</h4>
                <div className='stat-value'>{Array.isArray(appeals) ? appeals.length : 0}</div>
              </div>
              <div className='stat-card'>
                <h4 className='stat-label'>VISIBILITY</h4>
                <div className='stat-value uppercase'>{community.visibility}</div>
              </div>
            </div>

            {/* Delete Community Section - Admin Only */}
            {isAdmin && (
              <div className='danger-zone'>
                <h3 className='danger-zone-title'>Danger Zone</h3>
                <p className='danger-zone-text'>
                  Permanently delete this community. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button className='danger-btn' onClick={() => setShowDeleteConfirm(true)}>
                    <FiTrash2 className='nav-icon' />
                    Delete Community
                  </button>
                ) : (
                  <div className='delete-confirmation'>
                    <p className='confirm-text'>Are you sure? This cannot be undone!</p>
                    {deleteError && <p className='delete-error'>{deleteError}</p>}
                    <div className='confirm-actions'>
                      <button className='danger-btn confirm' onClick={handleDeleteCommunity}>
                        Yes, Delete Forever
                      </button>
                      <button
                        className='cancel-btn'
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteError(null);
                        }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className='dashboard-section fade-in'>
            <h2 className='section-title'>User Management</h2>
            <div className='search-wrapper'>
              <FiSearch className='search-icon' />
              <input
                type='text'
                className='search-input'
                placeholder='Search users...'
                value={userSearchQuery}
                onChange={handleQueryChange}
              />
            </div>

            <div className='user-results-list'>
              {foundUsers.length === 0 ? (
                <div className='empty-search-state'>
                  {userSearchQuery
                    ? 'No users found matching query.'
                    : 'Start typing to search for users.'}
                </div>
              ) : (
                foundUsers.map(u => {
                  const isBanned = community.banned?.includes(u.username);
                  const isMuted = community.muted?.includes(u.username);
                  const isModerator = community.moderators?.includes(u.username);
                  const isMember = community.participants.includes(u.username);

                  return (
                    <div key={u.username} className='user-row'>
                      <div className='user-info'>
                        <span className='username'>{u.username}</span>
                        {isMember && !isModerator && (
                          <span className='status-tag member'>MEMBER</span>
                        )}
                        {isModerator && <span className='status-tag moderator'>MOD</span>}
                        {isBanned && <span className='status-tag banned'>BANNED</span>}
                        {isMuted && <span className='status-tag muted'>MUTED</span>}
                      </div>
                      <div className='user-actions'>
                        {/* Only Admin can toggle moderators */}
                        {isAdmin && isMember && community.admin !== u.username && (
                          <button
                            onClick={() => handleToggleModerator(u.username)}
                            className={`action-btn ${isModerator ? 'active' : ''}`}
                            title={isModerator ? 'Remove Moderator' : 'Make Moderator'}>
                            {isModerator ? 'Remove Mod' : 'Make Mod'}
                          </button>
                        )}
                        {!isBanned && isMember && (
                          <button
                            onClick={() => handleToggleMute(u.username)}
                            className={`action-btn ${isMuted ? 'active' : ''}`}
                            title={isMuted ? 'Unmute User' : 'Mute User'}>
                            {isMuted ? 'Unmute' : 'Mute'}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleBan(u.username)}
                          className='action-btn danger'
                          title={isBanned ? 'Unban User' : 'Ban User'}>
                          {isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'appeals' && (
          <div className='dashboard-section fade-in'>
            <h2 className='section-title'>Appeals Review</h2>
            <p className='section-subtitle'>
              Review requests from banned or muted users to rejoin the community.
            </p>

            {/* Safe Check: Ensure appeals is an array before mapping */}
            {!hasAppeals ? (
              <div className='empty-state-card'>
                <FiCheckCircle className='check-icon' />
                <h3 className='empty-state-title'>All Caught Up!</h3>
                <p className='empty-state-text'>There are no pending appeals for this community.</p>
              </div>
            ) : (
              <div className='appeals-list'>
                {appeals.map((appeal: DatabaseAppeal) => (
                  <div key={appeal._id.toString()} className='appeal-card'>
                    <div className='appeal-header'>
                      <div className='appeal-user'>
                        <div className='user-avatar'>{appeal.username.charAt(0).toUpperCase()}</div>
                        <div>
                          <span className='appeal-username'>{appeal.username}</span>
                          <span className='timestamp'>
                            Submitted: {new Date(appeal.appealDateTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className='appeal-status'>Pending Review</div>
                    </div>

                    <div className='appeal-body'>
                      <h4 className='appeal-body-title'>Reason for Appeal:</h4>
                      <p className='appeal-body-text'>{appeal.description}</p>
                    </div>

                    <div className='appeal-actions'>
                      <button
                        className='appeal-btn approve'
                        onClick={() => handleUpdateAppealStatus(appeal._id.toString(), 'approve')}
                        title='Approve appeal and lift ban'>
                        Approve (Lift Ban)
                      </button>
                      <button
                        className='appeal-btn deny'
                        onClick={() => handleUpdateAppealStatus(appeal._id.toString(), 'deny')}
                        title='Deny appeal and dismiss'>
                        Deny & Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className='dashboard-section fade-in'>
            <h2 className='section-title'>Send Announcement</h2>
            <p className='section-subtitle'>Broadcast a notification to all community members.</p>

            <div className='announcement-form'>
              <div className='form-group'>
                <label htmlFor='announcement-title' className='form-label'>
                  Announcement Title
                </label>
                <input
                  id='announcement-title'
                  type='text'
                  className='form-input'
                  placeholder='Enter announcement title...'
                  value={announcementTitle}
                  onChange={e => setAnnouncementTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className='form-group'>
                <label htmlFor='announcement-message' className='form-label'>
                  Announcement Message
                </label>
                <textarea
                  id='announcement-message'
                  className='form-textarea'
                  placeholder='Enter your announcement message...'
                  value={announcementMsg}
                  onChange={e => setAnnouncementMsg(e.target.value)}
                  rows={6}
                  maxLength={500}
                />
                <div className='char-count'>{announcementMsg.length}/500 characters</div>
              </div>

              {announcementStatus && (
                <div
                  className={`announcement-status ${announcementStatus.includes('success') ? 'success' : 'error'}`}>
                  {announcementStatus}
                </div>
              )}

              <button
                className='send-announcement-btn'
                onClick={handleSendAnnouncement}
                disabled={!announcementTitle.trim() || !announcementMsg.trim()}>
                <FiRadio className='nav-icon' />
                Send Announcement
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CommunityDashboard;
