import React from 'react';
import './index.css';

interface AdBlockerModalProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

/**
 * AdBlockerModal component displays a message asking users to disable their ad blocker
 * Similar to news websites like WSJ and NYTimes
 */
const AdBlockerModal: React.FC<AdBlockerModalProps> = ({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className='adblocker-overlay'>
      <div className='adblocker-modal'>
        <div className='adblocker-header'>
          <h2>Ad Blocker Detected</h2>
        </div>
        <div className='adblocker-content'>
          <p className='adblocker-message'>
            We've noticed you're using an ad blocker. We rely on advertising revenue to keep our
            platform free and accessible to everyone.
          </p>
          <p className='adblocker-message'>
            Please consider disabling your ad blocker for this site, or whitelist us to continue
            enjoying our content.
          </p>
          <div className='adblocker-steps'>
            <h3>How to disable your ad blocker:</h3>
            <ol>
              <li>Click the ad blocker icon in your browser toolbar</li>
              <li>Select "Pause on this site" or "Don't run on this domain"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          <p className='adblocker-thank-you'>Thank you for supporting our community!</p>
        </div>
        {onDismiss && (
          <div className='adblocker-actions'>
            <button className='adblocker-dismiss-btn' onClick={onDismiss}>
              Continue Anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBlockerModal;
