import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import {
  PopulatedUserNotificationStatus,
  PopulatedSafeDatabaseUser,
  NotificationPayload,
  UserUpdatePayload,
} from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { useNavigate } from 'react-router-dom';
import {
  getUserByUsername,
  readAllNotifications,
  readNotification,
  toggleCommunityNotifs,
  toggleMessageNotifs,
} from '../services/userService';

const useNotificationsPage = () => {
  const { user, socket } = useUserContext();
  const navigate = useNavigate();

  const [notificationsList, setNotificationsList] = useState<PopulatedUserNotificationStatus[]>([]);
  const [isTabOpen, setisTabOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<PopulatedSafeDatabaseUser | null>(null);

  /**
   * Helper to sort notifications by date (newest first)
   */
  const sortNotifications = (notifs: PopulatedUserNotificationStatus[]) => {
    return [...notifs].sort((a, b) => {
      const dateA = new Date(a.notification.dateTime || 0).getTime();
      const dateB = new Date(b.notification.dateTime || 0).getTime();
      return dateB - dateA;
    });
  };

  const handleToggleCommunityNotifs = async (): Promise<void> => {
    try {
      if (!user.username) return;
      const updatedUser = await toggleCommunityNotifs(user.username);
      if (updatedUser) setUserData(updatedUser);
    } catch (error) {
      /* handle error */
    }
  };

  const handleToggleMessageNotifs = async (): Promise<void> => {
    try {
      if (!user.username) return;
      const updatedUser = await toggleMessageNotifs(user.username);
      if (updatedUser) setUserData(updatedUser);
    } catch (error) {
      /* handle error */
    }
  };

  const handleNotificationRedirect = (notif: DatabaseNotification): void => {
    switch (notif.type) {
      case 'comment':
      case 'answer':
        navigate(`/question/${notif.contextId}`);
        break;
      case 'report':
      case 'appeal':
        navigate(`/communities/manage/${notif.contextId}`);
        break;
      case 'ban':
      case 'mute':
        navigate(`/communities/appeals/${notif.contextId}`);
        break;
      case 'message':
        navigate(`/messaging/direct-message`);
        break;
    }
  };

  const handleReadNotification = async (notifId: string): Promise<void> => {
    await readNotification(user.username, notifId);
  };

  const handleReadAllNotifications = async (): Promise<void> => {
    const notificationIds = notificationsList.map(n => n.notification._id.toString());
    await readAllNotifications(user.username, notificationIds);
  };

  useEffect(() => {
    const fetchFreshNotifications = async () => {
      if (!user.username) return;
      try {
        const freshUser = await getUserByUsername(user.username);
        if (freshUser && freshUser.notifications) {
          setNotificationsList(sortNotifications(freshUser.notifications));
        }
      } catch (e) {
        // nothing happens
      }
    };

    fetchFreshNotifications();
  }, [user.username]);

  useEffect(() => {
    const handleNotificationUpdate = (payload: NotificationPayload) => {
      setNotificationsList(prev => {
        const newList = [payload.notificationStatus, ...prev];
        return sortNotifications(newList);
      });
    };

    const handleUserUpdate = (payload: UserUpdatePayload) => {
      if (payload.type === 'updated') {
        if (payload.user.notifications) {
          setNotificationsList(sortNotifications(payload.user.notifications));
        }

        setUserData(payload.user);
      }
    };

    socket.on('notificationUpdate', handleNotificationUpdate);
    socket.on('userUpdate', handleUserUpdate);

    return () => {
      socket.off('notificationUpdate', handleNotificationUpdate);
      socket.off('userUpdate', handleUserUpdate);
    };
  }, [socket, user.username]);

  useEffect(() => {
    if (!user.username) return;
    const fetchUserData = async () => {
      try {
        const data = await getUserByUsername(user.username);
        setUserData(data);
      } catch (error) {
        /* nothing */
      }
    };
    fetchUserData();
  }, [user.username]);

  return {
    notificationsList,
    isTabOpen,
    setisTabOpen,
    handleNotificationRedirect,
    handleReadNotification,
    handleReadAllNotifications,
    handleToggleCommunityNotifs,
    handleToggleMessageNotifs,
    userData,
  };
};

export default useNotificationsPage;
