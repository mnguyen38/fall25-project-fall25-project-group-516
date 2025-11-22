import { FiCheckSquare, FiMessageSquare, FiSettings } from 'react-icons/fi';
import useNotificationsPage from '../../hooks/useNotificationsPage';
import './index.css';
import NotificationItem from '../notificationItem';

const Notifications = () => {
  const { notificationsList, handleNotificationRedirect } = useNotificationsPage();

  return (
    <div className='page-container'>
      <div className='page-content'>
        <div className='notifications-header'>
          <h1 className='page-title'>Notifications</h1>

          <div className='notifications-actions'>
            <button className='notification-action-btn' title='Mark all as read'>
              <FiCheckSquare size={20} />
              <span>Mark all as read</span>
            </button>
            <button className='notification-action-btn' title='Settings'>
              <FiSettings size={20} />
            </button>
          </div>
        </div>

        {notificationsList.length === 0 ? (
          <div className='empty-state'>
            <FiMessageSquare size={48} className='empty-state-icon' />
            <h3 className='empty-state-title'>No notifications yet</h3>
            <p className='empty-state-text'>We'll let you know when something comes up!</p>
          </div>
        ) : (
          <ul className='notifications-list'>
            {notificationsList.map((notif, index) => (
              <NotificationItem
                key={notif._id?.toString() || index}
                notification={notif}
                onClick={handleNotificationRedirect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
