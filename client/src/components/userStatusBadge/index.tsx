import React from 'react';
import './index.css';

interface UserStatusBadgeProps {
  status?: 'online' | 'busy' | 'away';
  customStatus?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  status = 'online',
  customStatus,
  showLabel = false,
  size = 'medium',
}) => {
  const statusConfig = {
    online: { icon: '🟢', label: 'Online', color: '#44b700' },
    busy: { icon: '🔴', label: 'Busy', color: '#ff4444' },
    away: { icon: '🟡', label: 'Away', color: '#ffa500' },
  };

  const config = statusConfig[status];

  return (
    <div className={`user-status-badge ${size}`} title={customStatus || config.label}>
      <span className='status-indicator' style={{ color: config.color }}>
        {config.icon}
      </span>
      {showLabel && (
        <div className='status-info'>
          <span className='status-label'>{config.label}</span>
          {customStatus && <span className='custom-status'>{customStatus}</span>}
        </div>
      )}
    </div>
  );
};

export default UserStatusBadge;
