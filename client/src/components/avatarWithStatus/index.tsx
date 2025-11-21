import React from 'react';
import './index.css';

interface AvatarWithStatusProps {
  username: string;
  profilePicture?: string;
  status?: 'online' | 'busy' | 'away';
  customStatus?: string;
  size?: 'small' | 'medium' | 'large';
  showStatusBadge?: boolean;
}

const AvatarWithStatus: React.FC<AvatarWithStatusProps> = ({
  username,
  profilePicture,
  status = 'online',
  customStatus,
  size = 'medium',
  showStatusBadge = true,
}) => {
  const statusConfig = {
    online: { color: '#44b700', icon: '🟢' },
    busy: { color: '#ff4444', icon: '🔴' },
    away: { color: '#ffa500', icon: '🟡' },
  };

  const config = statusConfig[status];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`avatar-with-status ${size}`} title={customStatus || `${username} - ${status}`}>
      <div className='avatar-container'>
        {profilePicture ? (
          <img src={profilePicture} alt={username} className='avatar-image' />
        ) : (
          <div className='avatar-placeholder'>{getInitials(username)}</div>
        )}
        {showStatusBadge && (
          <div className='status-indicator' style={{ backgroundColor: config.color }}>
            <span className='status-icon'>{config.icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarWithStatus;
