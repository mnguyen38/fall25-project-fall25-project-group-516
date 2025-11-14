import { useState, useMemo, ChangeEvent } from 'react';
import './index.css';
import { DatabaseCommunity } from '@fake-stack-overflow/shared';

const ModToolsModal = ({
  isOpen,
  onClose,
  community,
  onToggleModerator,
  onDeleteCommunity,
}: {
  isOpen: boolean;
  onClose: () => void;
  community: DatabaseCommunity;
  onToggleModerator: (username: string) => void;
  onDeleteCommunity: () => void;
}) => {
  const [modSearchQuery, setModSearchQuery] = useState<string>('');

  const foundUsers = useMemo(() => {
    const query = modSearchQuery.trim().toLowerCase();
    if (query === '') return [];

    return community.participants.filter(
      participant => participant !== community.admin && participant.toLowerCase().includes(query),
    );
  }, [modSearchQuery, community.participants, community.admin]);

  if (!isOpen) {
    return null;
  }

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setModSearchQuery(e.target.value);
  };

  return (
    <>
      <div className='modal-overlay' onClick={onClose}>
        <div className='modal-content' onClick={handleContentClick}>
          <div className='modal-header'>
            <h3 className='modal-title'>Moderation Tools</h3>
            <button className='modal-close-btn' onClick={onClose}>
              &times;
            </button>
          </div>

          <div className='modal-body'>
            <h4 className='mod-tools-subheading'>Manage Moderators</h4>

            <div className='search-bar-wrapper'>
              <span className='search-icon'>🔍</span>
              <input
                type='text'
                className='mod-search-input'
                placeholder='Find user to moderate...'
                value={modSearchQuery}
                onChange={handleSearchChange} // Use the typed handler
                autoFocus
              />
            </div>

            <ul className='mod-manage-list'>
              {modSearchQuery.trim() === '' && (
                <li className='mod-placeholder'>Type in the search bar to find users.</li>
              )}

              {modSearchQuery.trim() !== '' && foundUsers.length === 0 && (
                <li className='mod-no-results'>No matching users found.</li>
              )}

              {foundUsers.map(username => {
                const isModerator = community.moderators?.includes(username);
                return (
                  <li key={username} className='mod-manage-item'>
                    <span className='username'>{username}</span>
                    <button
                      className={`mod-toggle-btn ${isModerator ? 'is-mod' : 'not-mod'}`}
                      onClick={() => onToggleModerator(username)}>
                      {isModerator ? 'Remove Mod' : 'Add Mod'}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className='danger-zone'>
              <h4 className='mod-tools-subheading'>Danger Zone</h4>
              <div className='danger-item'>
                <p>Permanently delete this community. This action cannot be undone.</p>
                <button className='delete-community-btn' onClick={onDeleteCommunity}>
                  Delete Community
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModToolsModal;
