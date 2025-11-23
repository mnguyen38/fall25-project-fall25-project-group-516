import { DatabaseNotification } from '@fake-stack-overflow/shared/types/notification';
import { getNotificationIcon, getTypeBackground, getTypeColor } from '../../utils/notif';
import getRelativeTime from '../../utils/time';
import { PopulatedUserNotificationStatus } from '@fake-stack-overflow/shared';

const NotificationItem = ({
  notificationStatus,
  onClick,
}: {
  notificationStatus: PopulatedUserNotificationStatus;
  onClick: (n: DatabaseNotification) => void;
}) => {
  const { notification, read } = notificationStatus;
  const TypeIcon = getNotificationIcon(notification.type);
  const iconColor = getTypeColor(notification.type);
  const bgColor = getTypeBackground(notification.type);

  return (
    <li
      className={`notification-item ${!read ? 'notification-unread' : ''}`}
      onClick={() => onClick(notification)}
      style={{ cursor: 'pointer' }}>
      <div className='notification-content'>
        {/* Left: Icon Circle */}
        <div className='notification-icon-wrapper'>
          <div className='notification-icon' style={{ backgroundColor: bgColor }}>
            <TypeIcon size={20} color={iconColor} />
          </div>
          {!read && <div className='notification-unread-dot' />}
        </div>

        {/* Right: Content */}
        <div className='notification-details'>
          {/* Header: Title + Timestamp */}
          <div className='notification-header'>
            <span className='notification-title'>
              {notification.title}
              <span className='notification-time'>• {getRelativeTime(notification.dateTime)}</span>
            </span>
          </div>

          {/* Body: Message */}
          <p className='notification-message'>{notification.msg}</p>

          {/* Footer: Type Label */}
          <div className='notification-footer'>
            <span className='notification-type' style={{ color: iconColor }}>
              {notification.type}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
};

export default NotificationItem;
