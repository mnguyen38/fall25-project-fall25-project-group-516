import React from 'react';
import { BadgeWithProgress } from '../../types/types';
import './index.css';

interface BadgeDisplayProps {
  badges: BadgeWithProgress[];
  onToggleBadge?: (badgeId: string, currentlyDisplayed: boolean) => void;
  displayedBadgeIds?: string[];
  showProgress?: boolean;
  editable?: boolean;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  onToggleBadge,
  displayedBadgeIds = [],
  showProgress = true,
  editable = false,
}) => {
  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  const renderBadge = (badge: BadgeWithProgress, isEarned: boolean) => {
    const isDisplayed = displayedBadgeIds.includes(badge._id.toString());
    const progressPercent = badge.progress
      ? Math.min((badge.userProgress / badge.requirement.threshold) * 100, 100)
      : 0;

    return (
      <div
        key={badge._id.toString()}
        className={`badge-item ${isEarned ? 'earned' : 'unearned'} ${isDisplayed ? 'displayed' : ''}`}
        title={badge.hint}>
        <div className='badge-icon'>
          <img
            src={`/badges/${badge.icon || 'default-badge.svg'}`}
            alt={badge.name}
            onError={e => {
              e.currentTarget.src = '/badges/default-badge.svg';
            }}
          />
        </div>
        <div className='badge-info'>
          <h4 className='badge-name'>{badge.name}</h4>
          <p className='badge-description'>{badge.description}</p>
          {showProgress && badge.progress && (
            <div className='badge-progress'>
              <div className='progress-bar'>
                <div className='progress-fill' style={{ width: `${progressPercent}%` }} />
              </div>
              <span className='progress-text'>
                {badge.userProgress} / {badge.requirement.threshold}
              </span>
            </div>
          )}
          {!isEarned && <p className='badge-hint'>{badge.hint}</p>}
        </div>
        {editable && isEarned && onToggleBadge && (
          <button
            className='badge-toggle-btn'
            onClick={() => onToggleBadge(badge._id.toString(), isDisplayed)}>
            {isDisplayed ? 'Hide' : 'Display'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className='badge-display'>
      {earnedBadges.length > 0 && (
        <div className='badge-section'>
          <h3>Earned Badges ({earnedBadges.length})</h3>
          <div className='badge-grid'>{earnedBadges.map(badge => renderBadge(badge, true))}</div>
        </div>
      )}

      {unearnedBadges.length > 0 && (
        <div className='badge-section'>
          <h3>Available Badges</h3>
          <div className='badge-grid'>{unearnedBadges.map(badge => renderBadge(badge, false))}</div>
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;
