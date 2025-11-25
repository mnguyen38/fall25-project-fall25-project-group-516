import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getUserByUsername,
  deleteUser,
  resetPassword,
  updateBiography,
  uploadProfilePicture,
  uploadBannerImage,
  updateShowLoginStreak,
} from '../services/userService';
import { getUserBadges, updateDisplayedBadges } from '../services/badgeService';
import { getAnswersByUser } from '../services/answerService';
import { PopulatedSafeDatabaseUser, BadgeWithProgress, DatabaseAnswer } from '../types/types';
import useUserContext from './useUserContext';
import useHeader from './useHeader';

/**
 * A custom hook to encapsulate all logic/state for the ProfileSettings component.
 */
const useProfileSettings = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useUserContext();
  const { handleSignOut } = useHeader();

  // Local state
  const [userData, setUserData] = useState<PopulatedSafeDatabaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [editBioMode, setEditBioMode] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Badge and image upload state
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [displayedBadgeIds, setDisplayedBadgeIds] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);

  // toggle login streak visibility
  const [showLoginStreak, setShowLoginStreak] = useState<boolean>(true);

  // User answers state
  const [userAnswers, setUserAnswers] = useState<DatabaseAnswer[]>([]);

  const canEditProfile =
    currentUser.username && userData?.username ? currentUser.username === userData.username : false;

  useEffect(() => {
    if (!username) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await getUserByUsername(username);
        setUserData(data);
        setDisplayedBadgeIds((data.displayedBadges || []).map(id => id.toString()));
      } catch (error) {
        setErrorMessage('Error fetching user profile');
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchBadges = async () => {
      try {
        const badgeData = await getUserBadges(username);
        setBadges(badgeData);
      } catch (error) {
        // console.error('Error fetching badges:', error);
      }
    };

    const fetchUserAnswers = async () => {
      try {
        const answers = await getAnswersByUser(username);
        setUserAnswers(answers);
      } catch (error) {
        // console.error('Error fetching user answers:', error);
      }
    };

    fetchUserData();
    fetchBadges();
    fetchUserAnswers();
  }, [username]);

  // Auto-dismiss success messages after 10 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Handler for updating login streak visibility in db
   */
  const handleToggleLoginStreak = async () => {
    if (!username) return;
    try {
      // Await the async call to update the login streak vis
      const updatedUser = await updateShowLoginStreak(username, showLoginStreak);

      setUserData(updatedUser);

      setSuccessMessage('Login streak visibility updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update biography.');
      setSuccessMessage(null);
    }
  };

  /**
   * Handler for previewing toggled login streak visibility
   */
  const handleToggleLoginStreakPreview = async () => {
    if (!username) return;
    setShowLoginStreak(!showLoginStreak);
    setSuccessMessage('Login streak toggle previewed!');
  };

  /**
   * Handler for resetting the password
   */
  const handleResetPassword = async (newPassword: string) => {
    if (!username) return;
    try {
      await resetPassword(username, newPassword);
      setSuccessMessage('Password reset successful!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to reset password.');
      setSuccessMessage(null);
      throw error;
    }
  };

  const handleUpdateBiography = async () => {
    if (!username) return;
    try {
      // Await the async call to update the biography
      const updatedUser = await updateBiography(username, newBio);

      // Ensure state updates occur sequentially after the API call completes
      await new Promise(resolve => {
        setUserData(updatedUser); // Update the user data
        setEditBioMode(false); // Exit edit mode
        resolve(null); // Resolve the promise
      });

      setSuccessMessage('Biography updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update biography.');
      setSuccessMessage(null);
    }
  };

  /**
   * Handler for deleting the user
   */
  const handleDeleteUser = async () => {
    if (!username) return;
    try {
      await deleteUser(username);
      setSuccessMessage(`User "${username}" deleted successfully.`);
      setErrorMessage(null);
      handleSignOut();
    } catch (error) {
      setErrorMessage('Failed to delete user.');
      setSuccessMessage(null);
      throw error;
    }
  };

  const handleEnteringEditMode = () => {
    if (userData?.profilePicture) setProfileImageUrl(userData?.profilePicture);
    if (userData?.bannerImage) setBannerImageUrl(userData?.bannerImage);
    if (userData?.showLoginStreak) setShowLoginStreak(userData?.showLoginStreak);
  };

  /**
   * Handler for uploading profile picture for preview.
   * @param file image
   */
  const handleProfilePicturePreview = (file: File) => {
    if (!username) return;
    const url = URL.createObjectURL(file);
    if (url) {
      setProfileImageUrl(url);
      setProfileImageFile(file);
      setSuccessMessage('Profile picture previewed!');
    } else {
      setErrorMessage('Failed to read file to url');
    }
  };

  /**
   * Handler for uploading banner picture for preview.
   * @param file image
   */
  const handleBannerImagePreview = (file: File) => {
    if (!username) return;
    const url = URL.createObjectURL(file);
    if (url) {
      setBannerImageUrl(url);
      setBannerImageFile(file);
      setSuccessMessage('Banner image previewed!');
    } else {
      setErrorMessage('Failed to read file to url');
    }
  };

  /**
   * Handler for uploading profile picture to database
   */
  const handleProfilePictureUpload = async () => {
    if (!username) return;
    if (!profileImageFile) {
      return;
    }
    try {
      setUploadingImage(true);
      const updatedUser = await uploadProfilePicture(username, profileImageFile);
      setUserData(updatedUser);

      // reset preview states
      setProfileImageFile(null);
      if (profileImageUrl) URL.revokeObjectURL(profileImageUrl);
      setProfileImageUrl(null);

      setSuccessMessage('Profile picture updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to upload profile picture.');
      setSuccessMessage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * Handler for uploading banner image to database
   */
  const handleBannerImageUpload = async () => {
    if (!username) return;
    if (!bannerImageFile) {
      return;
    }
    try {
      setUploadingImage(true);
      const updatedUser = await uploadBannerImage(username, bannerImageFile);
      setUserData(updatedUser);

      // reset preview states
      setBannerImageFile(null);
      if (bannerImageUrl) URL.revokeObjectURL(bannerImageUrl);
      setBannerImageUrl(null);

      setSuccessMessage('Banner image updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to upload banner image.');
      setSuccessMessage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * Handler for toggling badge display
   */
  const handleToggleBadge = async (badgeId: string, currentlyDisplayed: boolean) => {
    if (!username) return;
    try {
      let newDisplayedIds: string[];
      if (currentlyDisplayed) {
        newDisplayedIds = displayedBadgeIds.filter(id => id !== badgeId);
      } else {
        newDisplayedIds = [...displayedBadgeIds, badgeId];
      }

      await updateDisplayedBadges(username, newDisplayedIds);
      setDisplayedBadgeIds(newDisplayedIds);
      setSuccessMessage('Badge display updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update badge display.');
      setSuccessMessage(null);
    }
  };

  /**
   * Handles done button for profile edit.
   */
  const handleDoneButton = () => {
    handleProfilePictureUpload();
    handleBannerImageUpload();
    handleToggleLoginStreak();
  };

  /**
   * Handles cancel button for profile edit.
   */
  const handleCancelButton = () => {
    if (!username) return;
    let changed = false;
    if (profileImageFile) {
      setProfileImageFile(null);
      changed = true;
    }
    if (bannerImageFile) {
      setBannerImageFile(null);
      changed = true;
    }
    if (profileImageUrl) {
      URL.revokeObjectURL(profileImageUrl);
      setProfileImageUrl(null);
    }
    if (bannerImageUrl) {
      URL.revokeObjectURL(bannerImageUrl);
      setBannerImageUrl(null);
    }
    if (showLoginStreak) {
      setShowLoginStreak(true);
      changed = true;
    }
    if (changed) setSuccessMessage('All changes cancelled!');
  };

  return {
    userData,
    loading,
    editBioMode,
    setEditBioMode,
    newBio,
    setNewBio,
    successMessage,
    errorMessage,
    canEditProfile,
    handleResetPassword,
    handleUpdateBiography,
    showLoginStreak,
    handleToggleLoginStreak,
    handleToggleLoginStreakPreview,
    handleDeleteUser,
    badges,
    displayedBadgeIds,
    uploadingImage,
    handleProfilePictureUpload,
    handleBannerImageUpload,
    handleToggleBadge,
    profileImageUrl,
    bannerImageUrl,
    handleBannerImagePreview,
    handleProfilePicturePreview,
    handleCancelButton,
    handleDoneButton,
    handleEnteringEditMode,
    userAnswers,
  };
};

export default useProfileSettings;
