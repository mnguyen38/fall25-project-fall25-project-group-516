import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getUserByUsername,
  deleteUser,
  resetPassword,
  updateBiography,
  uploadProfilePicture,
  uploadBannerImage,
} from '../services/userService';
import { getUserBadges, updateDisplayedBadges } from '../services/badgeService';
import { SafeDatabaseUser, BadgeWithProgress } from '../types/types';
import useUserContext from './useUserContext';

/**
 * A custom hook to encapsulate all logic/state for the ProfileSettings component.
 */
const useProfileSettings = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserContext();

  // Local state
  const [userData, setUserData] = useState<SafeDatabaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [editBioMode, setEditBioMode] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Badge and image upload state
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [displayedBadgeIds, setDisplayedBadgeIds] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

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

    fetchUserData();
    fetchBadges();
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
      navigate('/');
    } catch (error) {
      setErrorMessage('Failed to delete user.');
      setSuccessMessage(null);
      throw error;
    }
  };

  const handleViewCollectionsPage = () => {
    navigate(`/collections/${username}`);
    return;
  };

  /**
   * Handler for uploading profile picture
   */
  const handleProfilePictureUpload = async (file: File) => {
    if (!username) return;
    try {
      setUploadingImage(true);
      const updatedUser = await uploadProfilePicture(username, file);
      setUserData(updatedUser);
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
   * Handler for uploading banner image
   */
  const handleBannerImageUpload = async (file: File) => {
    if (!username) return;
    try {
      setUploadingImage(true);
      const updatedUser = await uploadBannerImage(username, file);
      setUserData(updatedUser);
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
    handleDeleteUser,
    handleViewCollectionsPage,
    badges,
    displayedBadgeIds,
    uploadingImage,
    handleProfilePictureUpload,
    handleBannerImageUpload,
    handleToggleBadge,
  };
};

export default useProfileSettings;
