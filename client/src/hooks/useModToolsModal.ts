import { ChangeEvent, useMemo, useState } from 'react';
import useUsersListPage from './useUsersListPage';
import { DatabaseCommunity, ModToolConfirmation, ModToolSections } from '../types/types';
import { useNavigate } from 'react-router-dom';
import useUserContext from './useUserContext';
import {
  deleteCommunity,
  toggleBan,
  toggleModerator,
  sendAnnouncement,
  toggleMute,
} from '../services/communityService';
import { Notification } from '@fake-stack-overflow/shared/types/notification';

const useModToolsModal = (community: DatabaseCommunity) => {
  const { userList } = useUsersListPage();
  const { user } = useUserContext();

  const navigate = useNavigate();

  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<ModToolConfirmation>(null);
  const [expandedSection, setExpandedSection] = useState<ModToolSections>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Error state for modal actions (Mute, Ban, Mod, Delete)
  const [actionError, setActionError] = useState<string | null>(null);

  // Announcement State
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [announcementStatus, setAnnouncementStatus] = useState<string>('');

  const foundUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (query === '') return [];

    return userList.filter(
      u => u.username !== community.admin && u.username.toLowerCase().includes(query),
    );
  }, [userSearchQuery, userList, community.admin]);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserSearchQuery(e.target.value);
  };

  const handleDeleteCommunity = async () => {
    setActionError(null); // Clear previous errors
    if (community && community.admin === user.username) {
      try {
        // Service throws on error, so we await inside try/catch
        await deleteCommunity(community._id.toString(), user.username);
        navigate('/communities');
      } catch (e: unknown) {
        setActionError((e as Error).message || 'Failed to delete community');
      }
    }
  };

  const handleToggleModerator = async (userToToggle: string) => {
    setActionError(null);
    if (community && community.admin === user.username) {
      try {
        await toggleModerator(community._id.toString(), user.username, userToToggle);
      } catch (e: unknown) {
        setActionError((e as Error).message || 'Failed to toggle moderator status');
      }
    }
  };

  const handleToggleBan = async (userToBan: string) => {
    setActionError(null);
    if (
      community &&
      (community.moderators?.includes(user.username) || community.admin === user.username)
    ) {
      try {
        await toggleBan(community._id.toString(), user.username, userToBan);
      } catch (e: unknown) {
        setActionError((e as Error).message || 'Failed to toggle ban status');
      }
    }
  };

  const handleToggleMute = async (userToMute: string) => {
    setActionError(null);
    if (
      community &&
      (community.moderators?.includes(user.username) || community.admin === user.username)
    ) {
      try {
        await toggleMute(community._id.toString(), user.username, userToMute);
      } catch (e: unknown) {
        setActionError((e as Error).message || 'Failed to toggle mute status');
      }
    }
  };

  const handleSendAnnouncement = async () => {
    setAnnouncementStatus('');
    if (!announcementTitle.trim() || !announcementMsg.trim()) {
      setAnnouncementStatus('Title and message are required.');
      return;
    }

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

  return {
    userSearchQuery,
    setUserSearchQuery,
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
    actionError, // Pass error state to the View
    setActionError,
    announcementTitle,
    setAnnouncementTitle,
    announcementMsg,
    setAnnouncementMsg,
    announcementStatus,
    handleSendAnnouncement,
  };
};

export default useModToolsModal;
