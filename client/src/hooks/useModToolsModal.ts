import { ChangeEvent, useMemo, useState } from 'react';
import useUsersListPage from './useUsersListPage';
import { DatabaseCommunity } from '@fake-stack-overflow/shared';
import { useNavigate } from 'react-router-dom';
import useUserContext from './useUserContext';
import { deleteCommunity, toggleBan, toggleModerator } from '../services/communityService';
import { ModToolConfirmation, ModToolSections } from '../types/types';

const useModToolsModal = (community: DatabaseCommunity) => {
  const { userList } = useUsersListPage();
  const { user } = useUserContext();

  const navigate = useNavigate();

  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  const [confirmAction, setConfirmAction] = useState<ModToolConfirmation>(null);

  const [expandedSection, setExpandedSection] = useState<ModToolSections>(null);

  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
  };
};

export default useModToolsModal;
