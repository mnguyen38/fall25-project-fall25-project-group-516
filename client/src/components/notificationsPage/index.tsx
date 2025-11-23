import { FiCheckSquare, FiMessageSquare, FiSettings } from 'react-icons/fi';
import useNotificationsPage from '../../hooks/useNotificationsPage';
import './index.css';
import NotificationItem from '../notificationItem';
import React, { useState } from 'react';

const Notifications = () => {
  const {
    notificationsList,
    handleNotificationRedirect,
    handleReadNotification,
    handleReadAllNotifications,
    handleToggleCommunityNotifs,
    handleToggleMessageNotifs,
    // communityNotif,
    // messageNotif,
    // onOpenSettings,
    userData,
  } = useNotificationsPage();

  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const settingsDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  return (
    <div className='page-container'>
      <div className='page-content'>
        <div className='notifications-header'>
          <h1 className='page-title'>Notifications</h1>

          <div className='notifications-actions'>
            <button
              className='notification-action-btn'
              title='Mark all as read'
              onClick={handleReadAllNotifications}>
              <FiCheckSquare size={20} />
              <span>Mark all as read</span>
            </button>
            <div className='settings-dropdown-wrapper' ref={settingsDropdownRef}>
              <button
                className='notification-action-btn'
                title='Settings'
                onClick={() => {
                  setShowSettingsDropdown(!showSettingsDropdown);
                }}>
                <FiSettings size={20} />
              </button>
              {showSettingsDropdown && (
                <div className='settings-dropdown'>
                  <svg className='dropdown-shadow' width='375' height='322' viewBox='0 0 375 322'>
                    <defs>
                      <filter
                        id='blur-settings'
                        x='-0.053211679'
                        width='1.1064234'
                        y='-0.068773585'
                        height='1.1375472'>
                        <feGaussianBlur stdDeviation='6.075' />
                      </filter>
                    </defs>
                    <g transform='translate(0,120)'>
                      <path
                        style={{
                          opacity: 0.14,
                          fill: 'rgba(107, 68, 35, 0.3)',
                          fillOpacity: 1,
                          stroke: 'none',
                          strokeWidth: 1,
                          filter: 'url(#blur-settings)',
                        }}
                        d='M 187.5 59.5 L 176.5 70.5 L 61.107422 70.5 C 55.231364 70.5 50.5 75.229411 50.5 81.105469 L 50.5 260.89258 C 50.5 266.76864 55.231364 271.5 61.107422 271.5 L 187.5 271.5 L 313.89453 271.5 C 319.77059 271.5 324.5 266.76864 324.5 260.89258 L 324.5 81.105469 C 324.5 75.229411 319.77059 70.5 313.89453 70.5 L 198.5 70.5 L 187.5 59.5 z '
                        transform='translate(0,-120)'
                      />
                    </g>
                  </svg>
                  <svg
                    className='dropdown-container'
                    width='275'
                    height='242'
                    viewBox='0 0 275 242'>
                    <g transform='translate(0,20)'>
                      <path
                        className='dropdown-border'
                        fill='transparent'
                        strokeWidth='1.5'
                        d='m 137.5,221.5003 h -126.393699 c -5.8760576,0 -10.606602,-4.73054 -10.606602,-10.6066 v -199.787399 c 0,-5.8760576 4.7305444,-10.606602 10.606602,-10.606602 h 115.393699 l 11,-10.999699'
                      />
                      <path
                        className='dropdown-border'
                        fill='transparent'
                        strokeWidth='1.5'
                        d='m 137.5,-10.5 11,10.999699 h 115.3937 c 5.87606,0 10.6066,4.7305444 10.6066,10.606602 v 199.787399 c 0,5.87606 -4.73054,10.6066 -10.6066,10.6066 h -126.3937'
                      />
                    </g>
                  </svg>
                  <div className='dropdown-contents'>
                    <label className='dropdown-item'>
                      <input
                        type='checkbox'
                        checked={userData?.communityNotifs}
                        onChange={handleToggleCommunityNotifs}
                      />
                      Get Notifications for Community PSAs
                    </label>
                    <label className='dropdown-item'>
                      <input
                        type='checkbox'
                        checked={userData?.messageNotifs}
                        onChange={handleToggleMessageNotifs}
                      />
                      Get Notifications for Direct Messages
                    </label>
                    {/* <button
                      className='dropdown-item'
                      onClick={() => {
                        setShowSettingsDropdown(!showSettingsDropdown);
                        handleToggleCommunityNotifs();
                      }}>
                      <span>
                        {communityNotif
                          ? 'Community Notifications Enabled'
                          : 'Community Notifications Disabled'}
                      </span>
                    </button>
                    <button
                      className='dropdown-item'
                      onClick={() => {
                        setShowSettingsDropdown(!showSettingsDropdown);
                        handleToggleMessageNotifs();
                      }}>
                      <span>
                        {messageNotif
                          ? 'Direct Message Notifications Enabled'
                          : 'Direct Message Notifications Disabled'}
                      </span>
                    </button> */}
                  </div>
                </div>
              )}
            </div>
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
            {notificationsList.map(({ notification, read }, index) => (
              <NotificationItem
                key={notification._id?.toString() || index}
                notificationStatus={{ notification, read }}
                onClick={() => {
                  // 1. Mark as read if it isn't already
                  if (!read) {
                    handleReadNotification(notification._id.toString());
                  }
                  // 2. Proceed with the redirect
                  handleNotificationRedirect(notification);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
