import './index.css';
import { DatabaseCommunity } from '@fake-stack-overflow/shared';
import useModToolsModal from '../../../../hooks/useModToolsModal';

const ModToolsModal = ({
  community,
  onClose,
}: {
  community: DatabaseCommunity;
  onClose: () => void;
}) => {
  const {
    userSearchQuery,
    confirmAction,
    setConfirmAction,
    expandedSection,
    setExpandedSection,
    expandedUser,
    setExpandedUser,
    foundUsers,
    handleQueryChange,
    handleDeleteCommunity,
    handleToggleModerator,
    handleToggleBan,
    handleToggleMute,
    actionError, // Destructure error state from hook
    setActionError, // Destructure error setter/clearer from hook
    announcementTitle,
    setAnnouncementTitle,
    announcementMsg,
    setAnnouncementMsg,
    handleSendAnnouncement,
    announcementStatus,
  } = useModToolsModal(community);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleConfirmAction = (action: 'mod' | 'ban' | 'mute', username: string) => {
    // Clear any previous errors before attempting a new action
    if (setActionError) setActionError(null);

    if (action === 'ban') {
      handleToggleBan(username);
    } else if (action === 'mod') {
      handleToggleModerator(username);
    } else if (action === 'mute') {
      handleToggleMute(username);
    }
    setConfirmAction(null);
  };

  const toggleSection = (section: 'users' | 'danger' | 'announcement') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleUser = (username: string) => {
    setExpandedUser(expandedUser === username ? null : username);
  };

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={handleContentClick}>
        {/* Header */}
        <div className='modal-header'>
          <h3 className='modal-title'>Moderation Tools</h3>
          <button className='modal-close-btn' onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className='modal-body'>
          {/* Global Action Error Banner */}
          {actionError && (
            <div
              className='error-banner'
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #fecaca',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>{actionError}</span>
              </div>
              <button
                onClick={() => setActionError && setActionError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#991b1b',
                  padding: '0 4px',
                }}
                aria-label='Dismiss error'>
                &times;
              </button>
            </div>
          )}

          {/* Manage Users Section */}
          <div className='collapsible-section'>
            <button className='section-header' onClick={() => toggleSection('users')} type='button'>
              <div className='section-header-content'>
                <span className='section-icon'>👥</span>
                <h4 className='section-title'>Manage Users</h4>
              </div>
              <span className={`chevron ${expandedSection === 'users' ? 'expanded' : ''}`}>▼</span>
            </button>

            {expandedSection === 'users' && (
              <div className='section-content'>
                {/* Search Bar */}
                <div className='search-bar-wrapper'>
                  <span className='search-icon'>🔍</span>
                  <input
                    type='text'
                    className='mod-search-input'
                    placeholder='Search users by username...'
                    value={userSearchQuery}
                    onChange={handleQueryChange}
                    autoFocus
                  />
                </div>

                {/* User List */}
                <div className='user-list-container'>
                  {userSearchQuery.trim() === '' && (
                    <div className='empty-state'>
                      <div className='empty-state-icon'>👥</div>
                      <div className='empty-state-text'>Type in the search bar to find users</div>
                    </div>
                  )}

                  {userSearchQuery.trim() !== '' && foundUsers.length === 0 && (
                    <div className='empty-state'>
                      <div className='empty-state-icon'>🔍</div>
                      <div className='empty-state-text'>
                        No users found matching "{userSearchQuery}"
                      </div>
                    </div>
                  )}

                  {foundUsers.map(user => {
                    const isModerator = community.moderators?.includes(user.username);
                    const isParticipant = community.participants.includes(user.username);
                    const isBanned = community.banned?.includes(user.username);
                    const isMuted = community.muted?.includes(user.username);
                    const isUserExpanded = expandedUser === user.username;

                    return (
                      <div key={user.username} className='user-card'>
                        <button
                          className='user-card-header'
                          onClick={() => toggleUser(user.username)}
                          type='button'>
                          <div className='user-header'>
                            <span className='username-display'>{user.username}</span>
                            {isModerator && (
                              <span className='badge badge-moderator'>MODERATOR</span>
                            )}
                            {isBanned && <span className='badge badge-banned'>BANNED</span>}
                            {isMuted && !isBanned && (
                              <span className='badge badge-muted'>MUTED</span>
                            )}
                            {!isParticipant && (
                              <span className='badge badge-non-member'>NOT A MEMBER</span>
                            )}
                          </div>
                          <span className={`chevron ${isUserExpanded ? 'expanded' : ''}`}>▼</span>
                        </button>

                        {isUserExpanded && (
                          <div className='user-card-content'>
                            {/* Moderator Controls */}
                            {isParticipant && !isBanned && (
                              <div className='action-section action-section-moderator'>
                                <div className='action-content'>
                                  <div>
                                    <div className='action-title'>
                                      {isModerator
                                        ? '🛡️ Moderator Privileges'
                                        : '👤 Community Member'}
                                    </div>
                                    <div className='action-description'>
                                      {isModerator
                                        ? 'Can moderate question, answers, comments, and manage users within this community.'
                                        : 'Grant moderator access to manage community'}
                                    </div>
                                  </div>
                                  {confirmAction?.action === 'mod' &&
                                  confirmAction?.username === user.username ? (
                                    <div className='confirm-actions'>
                                      <span className='confirm-text'>Sure?</span>
                                      <button
                                        onClick={() => handleConfirmAction('mod', user.username)}
                                        className='btn btn-confirm-mod'>
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmAction(null)}
                                        className='btn btn-cancel-mod'>
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        setConfirmAction({
                                          action: 'mod',
                                          username: user.username,
                                        })
                                      }
                                      className={`btn ${isModerator ? 'btn-remove-mod' : 'btn-add-mod'}`}>
                                      {isModerator ? 'Remove Moderator' : 'Make Moderator'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Mute Controls */}
                            {isParticipant && !isBanned && (
                              <div
                                className={`action-section ${isMuted ? 'action-section-muted' : 'action-section-mute'}`}>
                                <div className='action-content'>
                                  <div>
                                    <div className='action-title'>
                                      {isMuted ? '🔇 User Muted' : '🔇 Mute User'}
                                    </div>
                                    <div className='action-description'>
                                      {isMuted
                                        ? 'User cannot post or comment in this community'
                                        : 'Prevents user from posting or commenting in this community.'}
                                    </div>
                                  </div>
                                  {confirmAction?.action === 'mute' &&
                                  confirmAction?.username === user.username ? (
                                    <div className='confirm-actions'>
                                      <span className='confirm-text'>Sure?</span>
                                      <button
                                        onClick={() => handleConfirmAction('mute', user.username)}
                                        className={`btn ${isMuted ? 'btn-confirm-unmute' : 'btn-confirm-mute'}`}>
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmAction(null)}
                                        className={`btn ${isMuted ? 'btn-cancel-muted' : 'btn-cancel-mute'}`}>
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        setConfirmAction({
                                          action: 'mute',
                                          username: user.username,
                                        })
                                      }
                                      className={`btn ${isMuted ? 'btn-unmute' : 'btn-mute'}`}>
                                      {isMuted ? '✓ Unmute User' : 'Mute User'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Ban Controls */}
                            <div
                              className={`action-section ${isBanned ? 'action-section-banned' : 'action-section-ban'}`}>
                              <div className='action-content'>
                                <div>
                                  <div className='action-title'>
                                    {isBanned ? '🚫 User Banned' : '⚠️ Ban User'}
                                  </div>
                                  <div className='action-description'>
                                    {isBanned
                                      ? 'Cannot access community or post content'
                                      : 'Prevents user from accessing this community. Will remove user from community if a member.'}
                                  </div>
                                </div>
                                {confirmAction?.action === 'ban' &&
                                confirmAction?.username === user.username ? (
                                  <div className='confirm-actions'>
                                    <span className='confirm-text'>Sure?</span>
                                    <button
                                      onClick={() => handleConfirmAction('ban', user.username)}
                                      className={`btn ${isBanned ? 'btn-confirm-unban' : 'btn-confirm-ban'}`}>
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setConfirmAction(null)}
                                      className={`btn ${isBanned ? 'btn-cancel-banned' : 'btn-cancel-ban'}`}>
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setConfirmAction({
                                        action: 'ban',
                                        username: user.username,
                                      })
                                    }
                                    className={`btn ${isBanned ? 'btn-unban' : 'btn-ban'}`}>
                                    {isBanned ? '✓ Unban User' : 'Ban User'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Announcement Section */}
          <div className='collapsible-section'>
            <button
              className='section-header'
              onClick={() => toggleSection('announcement')}
              type='button'>
              <div className='section-header-content'>
                <span className='section-icon'>📢</span>
                <h4 className='section-title'>Make Announcement</h4>
              </div>
              <span className={`chevron ${expandedSection === 'announcement' ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>

            {expandedSection === 'announcement' && (
              <div className='section-content'>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                  <input
                    type='text'
                    className='mod-search-input'
                    placeholder='Announcement Title'
                    value={announcementTitle}
                    onChange={e => setAnnouncementTitle(e.target.value)}
                  />
                  <textarea
                    className='mod-search-input'
                    placeholder='Message'
                    value={announcementMsg}
                    onChange={e => setAnnouncementMsg(e.target.value)}
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                  <button className='btn btn-add-mod' onClick={handleSendAnnouncement}>
                    Send Announcement
                  </button>
                  {announcementStatus && (
                    <p
                      style={{
                        margin: 0,
                        color: announcementStatus.includes('Failed') ? '#dc2626' : '#15803d',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}>
                      {announcementStatus}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone Section */}
          <div className='collapsible-section'>
            <button
              className='section-header section-header-danger'
              onClick={() => toggleSection('danger')}
              type='button'>
              <div className='section-header-content'>
                <span className='section-icon'>⚠️</span>
                <h4 className='section-title'>Danger Zone</h4>
              </div>
              <span className={`chevron ${expandedSection === 'danger' ? 'expanded' : ''}`}>▼</span>
            </button>

            {expandedSection === 'danger' && (
              <div className='section-content'>
                <div className='danger-zone-content'>
                  <p className='danger-zone-text'>
                    Permanently delete this community. This action cannot be undone and will remove
                    all posts, comments, and data.
                  </p>
                  <button className='btn btn-delete-community' onClick={handleDeleteCommunity}>
                    Delete Community
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModToolsModal;
