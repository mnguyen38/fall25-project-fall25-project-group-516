import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import { NotificationPayload, ReadAllNotificationsPayload } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { useNavigate } from 'react-router-dom';
import { readAllNotifications, readNotification } from '../services/notificationService';

const useNotificationsPage = () => {
  const { user, socket } = useUserContext();
  const navigate = useNavigate();

  const [notificationsList, setNotificationsList] = useState<DatabaseNotification[]>(
    user.notifications ?? [],
  );

  const [isTabOpen, setisTabOpen] = useState<boolean>(false);

  const handleNotificationRedirect = (notif: DatabaseNotification): void => {
    switch (notif.type) {
      case 'comment':
      case 'answer':
      case 'community':
        navigate(`/question/${notif.contextId}`);
        break;
      case 'report':
      case 'unban':
        navigate(`/manage/${notif.contextId}`);
        break;
      case 'message':
        navigate(`/messaging/direct-message`);
        break;
    }
  };

  const handleReadNotification = async (notifId: string): Promise<void> => {
    await readNotification(notifId);
  };

  const handleReadAllNotifications = async (): Promise<void> => {
    await readAllNotifications();
  };
  console.log(user.notifications);
  useEffect(() => {
    const sortNotifications = async () => {
      const sortedResult = [...notificationsList].sort((a, b) => {
        const dateA = new Date(a.dateTime || 0).getTime();
        const dateB = new Date(b.dateTime || 0).getTime();

        return dateB - dateA;
      });

      setNotificationsList(sortedResult);
    };

    const handleNotificationUpdate = (notificationUpdate: NotificationPayload) => {
      const { notification } = notificationUpdate;
      if (notification.receiver === user.username) {
        setNotificationsList(prev => [notification, ...prev]);
      }
    };

    const handleReadNotificationUpdate = (notificationUpdate: NotificationPayload) => {
      const { notification } = notificationUpdate;
      console.log(notification)
      if (notification.receiver === user.username) {
        setNotificationsList(prev =>
          prev.map(n => (n._id === notification._id ? notification : n)),
        );
      }
    };

    const handleReadAllNotificationsUpdate = (
      readAllNotificationsUpdate: ReadAllNotificationsPayload,
    ) => {
      const { notifications } = readAllNotificationsUpdate;
      console.log(notifications)

      // Replace prev notifications with new notification from notifications list if ids match
      if (notifications.some(n => n.receiver === user.username)) {
        setNotificationsList(prev =>
          prev.map(n => {
            // Check if this specific notification 'n' is in the list of updated ones
            const updatedNotification = notifications.find(updated => updated._id === n._id);
            // If found, return the updated version (read: true), otherwise keep the old one
            return updatedNotification || n;
          }),
        );
      }
    };
    sortNotifications();

    socket.on('notificationUpdate', handleNotificationUpdate);
    socket.on('readUpdate', handleReadNotificationUpdate);
    socket.on('readlAllUpdate', handleReadAllNotificationsUpdate);

    return () => {
      socket.off('notificationUpdate', handleNotificationUpdate);
      socket.off('readUpdate', handleReadNotificationUpdate);
      socket.off('readlAllUpdate', handleReadAllNotificationsUpdate);
    };
  }, [socket]);

  return {
    notificationsList,
    isTabOpen,
    setisTabOpen,
    handleNotificationRedirect,
    handleReadNotification,
    handleReadAllNotifications,
  };
};

export default useNotificationsPage;
