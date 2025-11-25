import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import useUserContext from './useUserContext';
import useUsersListPage from './useUsersListPage';
import { CommunityUpdatePayload, DatabaseAppeal, DatabaseCommunity } from '../types/types';
import { useParams } from 'react-router-dom';
import {
  getCommunityAppeals,
  getCommunityById,
  toggleBan,
  toggleMute,
  toggleModerator,
  updateAppealStatus,
} from '../services/communityService';

const useCommunityDashboard = () => {
  const { user, socket } = useUserContext();
  const { communityID } = useParams();

  // User list for search functionality
  const { userList } = useUsersListPage();

  // State
  const [community, setCommunity] = useState<DatabaseCommunity | null>(null);
  const [appeals, setAppeals] = useState<DatabaseAppeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  /**
   * Fetches the list of appeals for the community.
   */
  const fetchAppeals = async (communityId: string) => {
    try {
      const appealsData = await getCommunityAppeals(communityId, user.username);
      setAppeals(appealsData);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /**
   * Fetches the community details.
   */
  const fetchCommunity = async (communityId: string) => {
    try {
      const communityData = await getCommunityById(communityId);
      setCommunity(communityData);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /**
   * Refreshes all dashboard data.
   */
  const refreshDashboard = () => {
    if (communityID) {
      fetchCommunity(communityID);
      fetchAppeals(communityID);
    }
  };

  // --- Search Logic ---

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserSearchQuery(e.target.value);
  };

  const foundUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (query === '' || !community) return [];

    return userList.filter(
      u => u.username !== community.admin && u.username.toLowerCase().includes(query),
    );
  }, [userSearchQuery, userList, community]);

  // --- Moderator Actions ---

  const handleToggleBan = async (usernameToBan: string) => {
    if (!communityID || !user.username) return;
    setActionError(null);

    try {
      await toggleBan(communityID, user.username, usernameToBan);
      refreshDashboard();
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Failed to toggle ban status');
    }
  };

  const handleToggleMute = async (usernameToMute: string) => {
    if (!communityID || !user.username) return;
    setActionError(null);

    try {
      await toggleMute(communityID, user.username, usernameToMute);
      refreshDashboard();
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Failed to toggle mute status');
    }
  };

  const handleUpdateAppealStatus = async (appealId: string, status: 'deny' | 'approve') => {
    if (!communityID || !user.username) return;
    setActionError(null);

    try {
      await updateAppealStatus(communityID, appealId, status, user.username);
      refreshDashboard();
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Failed to update appeal status');
    }
  };

  const handleToggleModerator = async (usernameToMod: string) => {
    if (!communityID || !user.username) return;
    if (community?.admin !== user.username) {
      setActionError('Only the admin can assign moderators.');
      return;
    }
    setActionError(null);

    try {
      await toggleModerator(communityID, user.username, usernameToMod);
      refreshDashboard();
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Failed to toggle moderator status');
    }
  };

  // --- Effects ---

  useEffect(() => {
    if (communityID) {
      refreshDashboard();
    }

    const handleCommunityUpdate = async (payload: CommunityUpdatePayload) => {
      if (payload.community._id.toString() === communityID) {
        if (payload.type === 'updated') {
          // Update local community state immediately
          setCommunity(prev => ({ ...prev, ...payload.community }));
          // Re-fetch appeals as they might have changed or context might have shifted
          fetchAppeals(payload.community._id.toString());
        } else if (payload.type === 'deleted') {
          setCommunity(null);
          setAppeals([]);
          setError('This community has been deleted.');
        }
      }
    };

    socket.on('communityUpdate', handleCommunityUpdate);

    return () => {
      socket.off('communityUpdate', handleCommunityUpdate);
    };
  }, [communityID, socket, user.username]);

  return {
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
  };
};

export default useCommunityDashboard;
