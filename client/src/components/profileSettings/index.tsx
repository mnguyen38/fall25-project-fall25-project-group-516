import * as React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';
import ImageUpload from '../imageUpload';
import BadgeDisplay from '../badgeDisplay';
import ResetPasswordModal from '../resetPasswordModal';
import DeleteAccountModal from '../deleteAccountModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faGears, faKey, faTrash } from '@fortawesome/free-solid-svg-icons';

const ProfileSettings: React.FC = () => {
  const {
    userData,
    loading,
    editBioMode,
    newBio,
    successMessage,
    errorMessage,
    canEditProfile,
    setEditBioMode,
    setNewBio,
    handleResetPassword,
    handleUpdateBiography,
    handleDeleteUser,
    handleViewCollectionsPage,
    badges,
    displayedBadgeIds,
    uploadingImage,
    handleToggleBadge,
    profileImageUrl,
    bannerImageUrl,
    handleBannerImagePreview,
    handleProfilePicturePreview,
    handleCancelButton,
    handleDoneButton,
    handleEnteringEditMode,
  } = useProfileSettings();

  const [showResetPasswordModal, setShowResetPasswordModal] = React.useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = React.useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  if (loading) {
    return (
      <div className='profile-settings'>
        <div className='loading-container'>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className='profile-settings'>
        <div className='profile-container'>
          <div className='profile-card'>
            <div className='profile-section'>
              <p>User not found. Please check the username and try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='profile-settings'>
      <div className='profile-container'>
        {/* Success/Error Messages */}
        {successMessage && <div className='success-message'>{successMessage}</div>}
        {errorMessage && <div className='error-message'>{errorMessage}</div>}

        {/* Profile Header Card */}
        <div className='profile-card profile-header'>
          {!editMode ? (
            <>
              {/* View Mode */}
              {/* Banner */}
              <div className='profile-banner'>
                {userData.bannerImage ? (
                  <img src={userData.bannerImage} alt='Profile banner' />
                ) : null}
              </div>

              {/* Profile Info */}
              <div className='profile-main-info'>
                <div className='profile-picture-section'>
                  <div className='profile-picture-wrapper'>
                    {userData.profilePicture ? (
                      <img src={userData.profilePicture} alt={userData.username} />
                    ) : (
                      <div className='profile-picture-placeholder'>
                        {userData.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className='profile-identity'>
                    <h1 className='profile-name'>{userData.username}</h1>
                    <p className='profile-username'>@{userData.username}</p>
                    {userData.showLoginStreak &&
                      userData.loginStreak !== undefined &&
                      userData.loginStreak > 0 && (
                        <p className='profile-login-streak'>
                          {userData.loginStreak} day login streak
                        </p>
                      )}
                    {userData.dateJoined && (
                      <p className='profile-date'>
                        Joined{' '}
                        {new Date(userData.dateJoined).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Icons */}
                {canEditProfile && (
                  <div className='profile-header-actions'>
                    <button
                      className='icon-button'
                      onClick={() => {
                        setEditMode(true);
                        handleEnteringEditMode();
                      }}
                      title='Edit profile'
                      aria-label='Edit profile'>
                      <FontAwesomeIcon icon={faPencil} />
                    </button>
                    <div className='settings-dropdown-wrapper' ref={settingsDropdownRef}>
                      <button
                        className='icon-button'
                        onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                        title='Settings'
                        aria-label='Settings'>
                        <FontAwesomeIcon icon={faGears} />
                      </button>
                      {showSettingsDropdown && (
                        <div className='settings-dropdown'>
                          <button
                            className='dropdown-item'
                            onClick={() => {
                              setShowSettingsDropdown(false);
                              setShowResetPasswordModal(true);
                            }}>
                            <FontAwesomeIcon icon={faKey} />
                            <span>Reset Password</span>
                          </button>
                          <button
                            className='dropdown-item dropdown-item-danger'
                            onClick={() => {
                              setShowSettingsDropdown(false);
                              setShowDeleteAccountModal(true);
                            }}>
                            <FontAwesomeIcon icon={faTrash} />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode - Same Layout as View Mode */}
              {/* Banner - Editable */}
              <div className='profile-banner editable-banner'>
                {bannerImageUrl ? (
                  <img src={bannerImageUrl} alt='Profile banner' />
                ) : (
                  <div className='empty-banner' />
                )}
                <div className='edit-overlay'>
                  <span>Click to change banner</span>
                </div>
                <ImageUpload
                  label=''
                  aspectRatio='banner'
                  currentImageUrl={userData.bannerImage}
                  onUpload={handleBannerImagePreview}
                />
              </div>

              {/* Profile Info */}
              <div className='profile-main-info'>
                <div className='profile-picture-section'>
                  {/* Profile Picture - Editable */}
                  <div className='profile-picture-wrapper editable-picture'>
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt={userData.username} />
                    ) : (
                      <div className='profile-picture-placeholder'>
                        {userData.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className='edit-overlay'>
                      <span>Click to change</span>
                    </div>
                    <ImageUpload
                      label=''
                      aspectRatio='square'
                      currentImageUrl={userData.profilePicture}
                      onUpload={handleProfilePicturePreview}
                    />
                  </div>
                  <div className='profile-identity'>
                    <h1 className='profile-name'>{userData.username}</h1>
                    <p className='profile-username'>@{userData.username}</p>
                    {userData.showLoginStreak &&
                      userData.loginStreak !== undefined &&
                      userData.loginStreak > 0 && (
                        <p className='profile-login-streak'>
                          {userData.loginStreak} day login streak
                        </p>
                      )}
                    {userData.dateJoined && (
                      <p className='profile-date'>
                        Joined{' '}
                        {new Date(userData.dateJoined).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Done Button */}
                <div className='profile-header-actions'>
                  <button
                    className='button button-primary'
                    onClick={() => {
                      handleDoneButton();
                      setEditMode(false);
                    }}
                    aria-label='Done editing'>
                    Done
                  </button>
                  <button
                    className='button button-secondary'
                    onClick={() => {
                      handleCancelButton();
                      setEditMode(false);
                    }}
                    aria-label='Cancel changes'>
                    Cancel
                  </button>
                </div>
              </div>

              {uploadingImage && (
                <div className='uploading-indicator-overlay'>
                  <span>Uploading image...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Biography Section */}
        <div className='profile-card'>
          <div className='profile-section'>
            <div className='section-header'>
              <h2 className='section-title'>About</h2>
              {canEditProfile && !editBioMode && (
                <button
                  className='button button-secondary'
                  onClick={() => {
                    setEditBioMode(true);
                    setNewBio(userData.biography || '');
                  }}>
                  Edit
                </button>
              )}
            </div>

            {!editBioMode ? (
              <div className='bio-section'>
                <div className='bio-content'>
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {userData.biography || 'No biography yet.'}
                  </Markdown>
                </div>
              </div>
            ) : (
              <div className='bio-edit'>
                <textarea
                  className='input-text'
                  value={newBio}
                  onChange={e => setNewBio(e.target.value)}
                  placeholder='Write something about yourself...'
                />
                <div className='button-group'>
                  <button className='button button-primary' onClick={handleUpdateBiography}>
                    Save
                  </button>
                  <button className='button button-secondary' onClick={() => setEditBioMode(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className='profile-card'>
            <div className='profile-section'>
              <h2 className='section-title'>Badges & Achievements</h2>
              <BadgeDisplay
                badges={badges}
                displayedBadgeIds={displayedBadgeIds}
                onToggleBadge={canEditProfile ? handleToggleBadge : undefined}
                showProgress
                editable={canEditProfile}
              />
            </div>
          </div>
        )}

        {/* Collections Link */}
        <div className='profile-card'>
          <div className='profile-section'>
            <button className='button button-primary' onClick={handleViewCollectionsPage}>
              View Collections
            </button>
          </div>
        </div>

        {/* Modals */}
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          onSubmit={handleResetPassword}
        />
        <DeleteAccountModal
          isOpen={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
          onConfirm={handleDeleteUser}
          username={userData.username}
        />
      </div>
    </div>
  );
};

export default ProfileSettings;
