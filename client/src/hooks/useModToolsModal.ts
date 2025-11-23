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
} from '../services/communityService';
import { Notification } from '@fake-stack-overflow/shared/types/notification';

const useModToolsModal = (community: DatabaseCommunity) => {
  const { userList } = useUsersListPage();
  const { user } = useUserContext();

  const navigate = useNavigate();

  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  const [confirmAction, setConfirmAction] = useState<ModToolConfirmation>(null);

  const [expandedSection, setExpandedSection] = useState<ModToolSections | 'announcement'>(null);

  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Announcement State
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [announcementStatus, setAnnouncementStatus] = useState<string>('');

  const foundUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (query === '') return [];

    return userList.filter(
      user => user.username !== community.admin && user.username.toLowerCase().includes(query),
    );
  }, [userSearchQuery, userList, community.admin]);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserSearchQuery(e.target.value);
  };

  const handleDeleteCommunity = async () => {
    if (community && community.admin === user.username) {
      await deleteCommunity(community._id.toString(), user.username);
      navigate('/communities');
    }
  };

  const handleToggleModerator = async (userToToggle: string) => {
    if (community && community.admin === user.username) {
      await toggleModerator(community._id.toString(), user.username, userToToggle);
    }
  };

  const handleToggleBan = async (userToBan: string) => {
    if (
      community &&
      (community.moderators?.includes(user.username) || community.admin === user.username)
    ) {
      await toggleBan(community._id.toString(), userToBan);
    }
  };

  const handleSendAnnouncement = async () => {
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
    announcementTitle,
    setAnnouncementTitle,
    announcementMsg,
    setAnnouncementMsg,
    announcementStatus,
    handleSendAnnouncement,
  };
};

export default useModToolsModal;
