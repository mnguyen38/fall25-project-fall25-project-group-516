import * as React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';
import ImageUpload from '../imageUpload';
import BadgeDisplay from '../badgeDisplay';
import ResetPasswordModal from '../resetPasswordModal';
import DeleteAccountModal from '../deleteAccountModal';
import UserStatusSelector from '../userStatusSelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faGears,
  faKey,
  faTrash,
  faRightFromBracket,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import useLoginContext from '../../hooks/useLoginContext';
import { removeAuthToken, toggleProfilePrivacy, updateStatus } from '../../services/userService';
import { getQuestionsByUser } from '../../services/questionService';
import Question from '../main/questionPage/question';
import { PopulatedDatabaseQuestion } from '../../types/types';
import UserContext from '../../contexts/UserContext';

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
    showLoginStreak,
    handleToggleLoginStreakPreview,
  } = useProfileSettings();

  const navigate = useNavigate();
  const { setUser } = useLoginContext();
  const AuserContext = React.useContext(UserContext);
  const socket = AuserContext?.socket;

  const [showResetPasswordModal, setShowResetPasswordModal] = React.useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = React.useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = React.useState(false);
  const [showStatusSelector, setShowStatusSelector] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [userQuestions, setUserQuestions] = React.useState<PopulatedDatabaseQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<'online' | 'busy' | 'away' | undefined>(
    userData?.status,
  );
  const [currentCustomStatus, setCurrentCustomStatus] = React.useState<string | undefined>(
    userData?.customStatus,
  );
  const [displayShowLoginStreak, setDisplayShowLoginStreak] = React.useState<boolean>(
    userData?.showLoginStreak ?? false,
  );
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    // Set status to away before logging out
    if (userData?.username) {
      try {
        await updateStatus(userData.username, 'away');
      } catch (error) {
        // console.error('Failed to update status on logout:', error);
      }
    }
    setUser(null);
    removeAuthToken();
    navigate('/');
  };

  const handleTogglePrivacy = async () => {
    if (!userData?.username) return;

    try {
      await toggleProfilePrivacy(userData.username);
      // Refresh the page to show updated privacy state
      window.location.reload();
    } catch {
      // Error handled silently
    }
  };

  const handleStatusChange = async (status: 'online' | 'busy' | 'away', customStatus: string) => {
    if (!userData?.username) return;

    try {
      await updateStatus(userData.username, status, customStatus);
      // Update local state immediately
      setCurrentStatus(status);
      setCurrentCustomStatus(customStatus);
      setShowStatusSelector(false);
    } catch (error) {
      // console.error('Failed to update status:', error);
    }
  };

  const getStatusDisplay = () => {
    if (!currentStatus) return null;

    // If profile is private and viewer is not the owner, always show "Away"
    if (userData?.profilePrivate && !canEditProfile) {
      return 'Away';
    }

    // If there's a custom status, show only that
    if (currentCustomStatus) {
      return currentCustomStatus;
    }

    // Otherwise show the default status
    const statusConfig = {
      online: { text: 'Online' },
      busy: { text: 'Busy' },
      away: { text: 'Away' },
    };

    return statusConfig[currentStatus].text;
  };

  // Sync local status state with userData
  React.useEffect(() => {
    if (userData) {
      setCurrentStatus(userData.status);
      setCurrentCustomStatus(userData.customStatus);
      setDisplayShowLoginStreak(userData.showLoginStreak ?? false);
    }
  }, [userData]);

  // Listen for real-time status updates via socket
  React.useEffect(() => {
    if (!socket || !userData) return;

    const handleStatusUpdate = (payload: {
      username: string;
      status: 'online' | 'busy' | 'away';
      customStatus?: string;
    }) => {
      // Only update if this is the user whose profile we're viewing
      if (payload.username === userData.username) {
        setCurrentStatus(payload.status);
        setCurrentCustomStatus(payload.customStatus || '');
      }
    };

    socket.on('userStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('userStatusUpdate', handleStatusUpdate);
    };
  }, [socket, userData]);

  // Listen for real-time user updates (e.g., login streak visibility) via socket
  React.useEffect(() => {
    if (!socket || !userData) return;

    const handleUserUpdate = (payload: {
      user: { username: string; showLoginStreak?: boolean };
      type: 'created' | 'deleted' | 'updated';
    }) => {
      // Only update if this is the user whose profile we're viewing and it's an update
      if (payload.type === 'updated' && payload.user.username === userData.username) {
        if (payload.user.showLoginStreak !== undefined) {
          setDisplayShowLoginStreak(payload.user.showLoginStreak);
        }
      }
    };

    socket.on('userUpdate', handleUserUpdate);

    return () => {
      socket.off('userUpdate', handleUserUpdate);
    };
  }, [socket, userData]);

  // Fetch user's questions
  React.useEffect(() => {
    const fetchUserQuestions = async () => {
      if (!userData?.username) return;

      try {
        setQuestionsLoading(true);
        const questions = await getQuestionsByUser(userData.username);
        setUserQuestions(questions);
      } catch {
        setUserQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchUserQuestions();
  }, [userData?.username]);

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

  // Close status dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusSelector(false);
      }
    };

    if (showStatusSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusSelector]);

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
                      <img src={userData.profilePicture} alt={`${userData.username}'s profile`} />
                    ) : (
                      <div className='profile-picture-placeholder'>
                        {userData.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className='profile-identity'>
                    {userData.premiumProfile === false && (
                      <h1 className='profile-name'>{userData.username}</h1>
                    )}
                    {userData.premiumProfile === true && (
                      <h1 className='profile-name'>{userData.username}&#x1F31F;</h1>
                    )}
                    <p className='profile-username'>@{userData.username}</p>
                    {displayShowLoginStreak &&
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
                    {getStatusDisplay() && (
                      <div className='status-dropdown-wrapper' ref={statusDropdownRef}>
                        <p
                          className={`profile-date ${canEditProfile ? 'profile-status-clickable' : ''}`}
                          onClick={() => canEditProfile && setShowStatusSelector(true)}
                          style={{ cursor: canEditProfile ? 'pointer' : 'default' }}>
                          {getStatusDisplay()}
                        </p>
                        {showStatusSelector && canEditProfile && (
                          <div className='status-dropdown'>
                            <svg
                              className='dropdown-shadow'
                              width='375'
                              height='322'
                              viewBox='0 0 375 322'>
                              <defs>
                                <filter
                                  id='blur-status'
                                  x='-0.053211679'
                                  width='1.1064234'
                                  y='-0.068773585'
                                  height='1.1375472'>
                                  <feGaussianBlur stdDeviation='6.075' />
                                </filter>
                              </defs>
                              <g transform='translate(0,120)'>
                                <path
                                  style={{
                                    opacity: 0.14,
                                    fill: 'rgba(107, 68, 35, 0.3)',
                                    fillOpacity: 1,
                                    stroke: 'none',
                                    strokeWidth: 1,
                                    filter: 'url(#blur-status)',
                                  }}
                                  d='M 187.5 59.5 L 176.5 70.5 L 61.107422 70.5 C 55.231364 70.5 50.5 75.229411 50.5 81.105469 L 50.5 260.89258 C 50.5 266.76864 55.231364 271.5 61.107422 271.5 L 187.5 271.5 L 313.89453 271.5 C 319.77059 271.5 324.5 266.76864 324.5 260.89258 L 324.5 81.105469 C 324.5 75.229411 319.77059 70.5 313.89453 70.5 L 198.5 70.5 L 187.5 59.5 z '
                                  transform='translate(0,-120)'
                                />
                              </g>
                            </svg>
                            <svg
                              className='dropdown-container'
                              width='275'
                              height='242'
                              viewBox='0 0 275 242'>
                              <g transform='translate(0,20)'>
                                <path
                                  className='dropdown-border'
                                  fill='transparent'
                                  strokeWidth='1.5'
                                  d='m 137.5,221.5003 h -126.393699 c -5.8760576,0 -10.606602,-4.73054 -10.606602,-10.6066 v -199.787399 c 0,-5.8760576 4.7305444,-10.606602 10.606602,-10.606602 h 115.393699 l 11,-10.999699'
                                />
                                <path
                                  className='dropdown-border'
                                  fill='transparent'
                                  strokeWidth='1.5'
                                  d='m 137.5,-10.5 11,10.999699 h 115.3937 c 5.87606,0 10.6066,4.7305444 10.6066,10.606602 v 199.787399 c 0,5.87606 -4.73054,10.6066 -10.6066,10.6066 h -126.3937'
                                />
                              </g>
                            </svg>
                            <UserStatusSelector
                              currentStatus={currentStatus}
                              currentCustomStatus={currentCustomStatus}
                              onStatusChange={handleStatusChange}
                              inline={true}
                            />
                          </div>
                        )}
                      </div>
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
                          <svg
                            className='dropdown-shadow'
                            width='375'
                            height='322'
                            viewBox='0 0 375 322'>
                            <defs>
                              <filter
                                id='blur-settings'
                                x='-0.053211679'
                                width='1.1064234'
                                y='-0.068773585'
                                height='1.1375472'>
                                <feGaussianBlur stdDeviation='6.075' />
                              </filter>
                            </defs>
                            <g transform='translate(0,120)'>
                              <path
                                style={{
                                  opacity: 0.14,
                                  fill: 'rgba(107, 68, 35, 0.3)',
                                  fillOpacity: 1,
                                  stroke: 'none',
                                  strokeWidth: 1,
                                  filter: 'url(#blur-settings)',
                                }}
                                d='M 187.5 59.5 L 176.5 70.5 L 61.107422 70.5 C 55.231364 70.5 50.5 75.229411 50.5 81.105469 L 50.5 260.89258 C 50.5 266.76864 55.231364 271.5 61.107422 271.5 L 187.5 271.5 L 313.89453 271.5 C 319.77059 271.5 324.5 266.76864 324.5 260.89258 L 324.5 81.105469 C 324.5 75.229411 319.77059 70.5 313.89453 70.5 L 198.5 70.5 L 187.5 59.5 z '
                                transform='translate(0,-120)'
                              />
                            </g>
                          </svg>
                          <svg
                            className='dropdown-container'
                            width='275'
                            height='242'
                            viewBox='0 0 275 242'>
                            <g transform='translate(0,20)'>
                              <path
                                className='dropdown-border'
                                fill='transparent'
                                strokeWidth='1.5'
                                d='m 137.5,221.5003 h -126.393699 c -5.8760576,0 -10.606602,-4.73054 -10.606602,-10.6066 v -199.787399 c 0,-5.8760576 4.7305444,-10.606602 10.606602,-10.606602 h 115.393699 l 11,-10.999699'
                              />
                              <path
                                className='dropdown-border'
                                fill='transparent'
                                strokeWidth='1.5'
                                d='m 137.5,-10.5 11,10.999699 h 115.3937 c 5.87606,0 10.6066,4.7305444 10.6066,10.606602 v 199.787399 c 0,5.87606 -4.73054,10.6066 -10.6066,10.6066 h -126.3937'
                              />
                            </g>
                          </svg>
                          <div className='dropdown-contents'>
                            <button
                              className='dropdown-item'
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                handleTogglePrivacy();
                              }}>
                              <FontAwesomeIcon
                                icon={userData?.profilePrivate ? faEye : faEyeSlash}
                              />
                              <span>
                                {userData?.profilePrivate
                                  ? 'Make Profile Public'
                                  : 'Make Profile Private'}
                              </span>
                            </button>
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
                              className='dropdown-item'
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                handleLogout();
                              }}>
                              <FontAwesomeIcon icon={faRightFromBracket} />
                              <span>Log Out</span>
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
                    {profileImageUrl || userData.profilePicture ? (
                      <img
                        src={profileImageUrl || userData.profilePicture}
                        alt={`${userData.username}'s profile`}
                      />
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
                    {showLoginStreak &&
                      userData.loginStreak !== undefined &&
                      userData.loginStreak > 0 && (
                        <p className='profile-login-streak'>
                          {userData.loginStreak} day login streak
                        </p>
                      )}
                    <label className='profile-identity-checkbox'>
                      <input
                        type='checkbox'
                        checked={showLoginStreak}
                        onChange={handleToggleLoginStreakPreview}
                      />
                      Show Login Streak
                    </label>
                    {userData.dateJoined && (
                      <p className='profile-date'>
                        Joined{' '}
                        {new Date(userData.dateJoined).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                    {getStatusDisplay() && (
                      <div className='status-dropdown-wrapper' ref={statusDropdownRef}>
                        <p
                          className='profile-date profile-status-clickable'
                          onClick={() => setShowStatusSelector(true)}
                          style={{ cursor: 'pointer' }}>
                          {getStatusDisplay()}
                        </p>
                        {showStatusSelector && (
                          <div className='status-dropdown'>
                            <svg
                              className='dropdown-shadow'
                              width='375'
                              height='322'
                              viewBox='0 0 375 322'>
                              <defs>
                                <filter
                                  id='blur-status-edit'
                                  x='-0.053211679'
                                  width='1.1064234'
                                  y='-0.068773585'
                                  height='1.1375472'>
                                  <feGaussianBlur stdDeviation='6.075' />
                                </filter>
                              </defs>
                              <g transform='translate(0,120)'>
                                <path
                                  style={{
                                    opacity: 0.14,
                                    fill: 'rgba(107, 68, 35, 0.3)',
                                    fillOpacity: 1,
                                    stroke: 'none',
                                    strokeWidth: 1,
                                    filter: 'url(#blur-status-edit)',
                                  }}
                                  d='M 187.5 59.5 L 176.5 70.5 L 61.107422 70.5 C 55.231364 70.5 50.5 75.229411 50.5 81.105469 L 50.5 260.89258 C 50.5 266.76864 55.231364 271.5 61.107422 271.5 L 187.5 271.5 L 313.89453 271.5 C 319.77059 271.5 324.5 266.76864 324.5 260.89258 L 324.5 81.105469 C 324.5 75.229411 319.77059 70.5 313.89453 70.5 L 198.5 70.5 L 187.5 59.5 z '
                                  transform='translate(0,-120)'
                                />
                              </g>
                            </svg>
                            <svg
                              className='dropdown-container'
                              width='275'
                              height='242'
                              viewBox='0 0 275 242'>
                              <g transform='translate(0,20)'>
                                <path
                                  className='dropdown-border'
                                  fill='transparent'
                                  strokeWidth='1.5'
                                  d='m 137.5,221.5003 h -126.393699 c -5.8760576,0 -10.606602,-4.73054 -10.606602,-10.6066 v -199.787399 c 0,-5.8760576 4.7305444,-10.606602 10.606602,-10.606602 h 115.393699 l 11,-10.999699'
                                />
                                <path
                                  className='dropdown-border'
                                  fill='transparent'
                                  strokeWidth='1.5'
                                  d='m 137.5,-10.5 11,10.999699 h 115.3937 c 5.87606,0 10.6066,4.7305444 10.6066,10.606602 v 199.787399 c 0,5.87606 -4.73054,10.6066 -10.6066,10.6066 h -126.3937'
                                />
                              </g>
                            </svg>
                            <UserStatusSelector
                              currentStatus={currentStatus}
                              currentCustomStatus={currentCustomStatus}
                              onStatusChange={handleStatusChange}
                              inline={true}
                            />
                          </div>
                        )}
                      </div>
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
        <div className='profile-card about-card'>
          <div className='profile-section about-section'>
            <div className='section-header about-header'>
              <h2 className='section-title'>About</h2>
              {canEditProfile && !editBioMode && (
                <button
                  className='edit-icon-btn'
                  onClick={() => {
                    setEditBioMode(true);
                    setNewBio(userData.biography || '');
                  }}
                  title='Edit about section'
                  aria-label='Edit about section'>
                  <FontAwesomeIcon icon={faPencil} />
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
        {userData.profilePrivate && !canEditProfile ? (
          <div className='profile-card'>
            <div className='profile-section'>
              <h2 className='section-title'>Badges & Achievements</h2>
              <p className='private-message'>This user account is private</p>
            </div>
          </div>
        ) : (
          badges.length > 0 && (
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
          )
        )}

        {/* User's Questions */}
        <div className='profile-card'>
          <div className='profile-section'>
            <h2 className='section-title'>
              Questions Posted{' '}
              {!userData.profilePrivate || canEditProfile ? `(${userQuestions.length})` : ''}
            </h2>
            {userData.profilePrivate && !canEditProfile ? (
              <p className='private-message'>This user account is private</p>
            ) : questionsLoading ? (
              <p>Loading questions...</p>
            ) : userQuestions.length > 0 ? (
              <div className='user-questions-list'>
                {userQuestions.map(question => (
                  <Question key={question._id.toString()} question={question} />
                ))}
              </div>
            ) : (
              <p>No questions posted yet.</p>
            )}
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
