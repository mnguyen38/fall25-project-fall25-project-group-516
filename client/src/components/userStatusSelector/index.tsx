import React, { useState, useEffect, useRef } from 'react';
import './index.css';

interface UserStatusSelectorProps {
  currentStatus?: 'online' | 'busy' | 'away';
  currentCustomStatus?: string;
  onStatusChange: (status: 'online' | 'busy' | 'away', customStatus: string) => void;
  inline?: boolean;
}

const UserStatusSelector: React.FC<UserStatusSelectorProps> = ({
  currentStatus = 'online',
  currentCustomStatus = '',
  onStatusChange,
  inline = false,
}) => {
  const [status, setStatus] = useState<'online' | 'busy' | 'away'>(currentStatus);
  const [customStatus, setCustomStatus] = useState(currentCustomStatus);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fade in animation for inline mode
  useEffect(() => {
    if (inline) {
      // Trigger fade-in after mount
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [inline]);

  const statusOptions = [
    { value: 'online' as const, label: 'Online', color: '#44b700' },
    { value: 'busy' as const, label: 'Busy', color: '#ff4444' },
    { value: 'away' as const, label: 'Away', color: '#ffa500' },
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === status) || statusOptions[0];

  const handleStatusSelect = (newStatus: 'online' | 'busy' | 'away') => {
    setStatus(newStatus);
    setShowDropdown(false);
    // Clear custom status when selecting a default status
    setCustomStatus('');
    onStatusChange(newStatus, '');
  };

  const handleCustomStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomStatus = e.target.value;
    setCustomStatus(newCustomStatus);
  };

  const handleCustomStatusSubmit = () => {
    onStatusChange(status, customStatus);
    // Don't close dropdown here - let parent handle it via onStatusChange callback
  };

  if (inline) {
    return (
      <div
        ref={containerRef}
        className={`user-status-selector-inline ${isVisible ? 'visible' : ''}`}>
        <div className='status-options'>
          {statusOptions.map(option => (
            <button
              key={option.value}
              className={`status-option ${status === option.value ? 'active' : ''}`}
              onClick={() => handleStatusSelect(option.value)}
              type='button'>
              <span className='status-label'>{option.label}</span>
            </button>
          ))}
        </div>
        <div className='custom-status-input'>
          <input
            type='text'
            placeholder='Custom status...'
            value={customStatus}
            onChange={handleCustomStatusChange}
            maxLength={100}
          />
          <button onClick={handleCustomStatusSubmit} type='button' className='save-btn'>
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='user-status-selector'>
      <div className='status-display' onClick={() => setShowDropdown(!showDropdown)}>
        <div className='status-text'>
          <div className='status-label'>{currentStatusOption.label}</div>
          {customStatus && <div className='custom-status'>{customStatus}</div>}
        </div>
        <span className='dropdown-arrow'>{showDropdown ? '▲' : '▼'}</span>
      </div>

      {showDropdown && (
        <div className='status-dropdown'>
          <div className='status-options'>
            {statusOptions.map(option => (
              <button
                key={option.value}
                className={`status-option ${status === option.value ? 'active' : ''}`}
                onClick={() => handleStatusSelect(option.value)}
                type='button'>
                <span className='status-label'>{option.label}</span>
              </button>
            ))}
          </div>
          <div className='custom-status-input'>
            <input
              type='text'
              placeholder='Custom status...'
              value={customStatus}
              onChange={handleCustomStatusChange}
              maxLength={100}
            />
            <button onClick={handleCustomStatusSubmit} type='button' className='save-btn'>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatusSelector;
