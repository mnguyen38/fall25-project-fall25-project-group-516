import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import { NotificationPayload } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../services/notificationService';

const useNotificationsPage = () => {
  const { socket } = useUserContext();
  const navigate = useNavigate();

  const [notificationsList, setNotificationsList] = useState<DatabaseNotification[]>([]);

  const [isTabOpen, setisTabOpen] = useState<boolean>(false);

  const handleNotificationRedirect = (notif: DatabaseNotification): void => {
    switch (notif.type) {
      case 'comment':
      case 'answer':
      case 'community':
        navigate(`/question/${notif.contextId}`);
      case 'report':
      case 'unban':
        navigate(`/manage/${notif.contextId}`);
      case 'message':
        navigate(`/messaging/direct-message`);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const result = await getNotifications();
      console.log(result);
      // Sorts newest to oldest
      result.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
      setNotificationsList(result);
    };

    const handleNotificationUpdate = (notificationUpdate: NotificationPayload) => {
      const { notification } = notificationUpdate;
      // Adds it to the front of the list
      setNotificationsList(prev => [notification, ...prev]);
    };

    fetchNotifications();

    socket.on('notificationEvent', handleNotificationUpdate);

    return () => {
      socket.off('notificationEvent', handleNotificationUpdate);
    };
  }, [socket]);

  return {
    notificationsList,
    isTabOpen,
    setisTabOpen,
    handleNotificationRedirect,
  };
};

export default useNotificationsPage;
