import useAppealsPage from '../../../hooks/useAppealsPage';
import { FaExclamationTriangle, FaUser, FaCheckCircle } from 'react-icons/fa';
import './index.css';

const AppealsPage: React.FC = () => {
  const {
    username,
    description,
    maxCharacters,
    characterCount,
    error,
    isSubmitDisabled,
    isAccountSuspended,
    isSubmitting,
    isSuccess,
    handleDescriptionChange,
    handleSubmit,
  } = useAppealsPage();

  const isOverLimit = characterCount > maxCharacters;
  const characterPercentage = Math.min((characterCount / maxCharacters) * 100, 100);

  if (isSuccess) {
    return (
      <div className='page-container'>
        <div className='page-content appeals-success-container'>
          <div className='appeals-success-content'>
            <FaCheckCircle className='appeals-success-icon' />
            <h2 className='appeals-success-title'>Appeal Submitted</h2>
            <p className='appeals-success-text'>
              Your appeal has been received and will be reviewed by our moderation team.
            </p>
            <p
              style={{
                color: 'var(--pancake-text-medium)',
                fontSize: '0.9rem',
                marginTop: '1rem',
              }}>
              Redirecting you to communities...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-container'>
      <div className='page-content'>
        <div className='page-header'>
          <h1 className='page-title'>Appeal Suspension</h1>
        </div>

        {/* API Error Message */}
        {error && (
          <div className='alert alert-error'>
            <p className='error-text'>{error}</p>
          </div>
        )}

        {/* Eligibility Warning */}
        {!isAccountSuspended && (
          <div className='alert alert-error appeals-warning'>
            <div className='appeals-warning-header'>
              <FaExclamationTriangle size={20} />
              <h2 className='appeals-warning-title'>You cannot submit an appeal</h2>
            </div>
            <p className='appeals-warning-text'>
              Your account is currently neither banned nor restricted.
            </p>
          </div>
        )}

        <div className='appeals-form-card'>
          <h2 className='appeals-form-title'>Submit ban or mute appeal</h2>

          <div className='appeals-instructions'>
            <p className='appeals-instructions-paragraph'>
              If you believe your account was incorrectly banned or muted you received a message
              directing you to this page, use this form to submit an appeal and we'll look into it.
            </p>
            <p className='appeals-instructions-paragraph'>
              Note: If you'd like to appeal an action that was taken against your account in
              response to a content violation, use the direct link in the message sent to your
              inbox; content violation appeals submitted via this form will not be processed.
            </p>
          </div>

          <div className='appeals-username-card'>
            <div className='appeals-username-icon'>
              <FaUser size={20} />
            </div>
            <div className='appeals-username-info'>
              <span className='appeals-username-label'>Username</span>
              <span className='appeals-username-value'>{username}</span>
            </div>
          </div>

          <div className='form-group'>
            <label className='form-label' htmlFor='description-input'>
              Describe why you believe your account was incorrectly flagged
            </label>
            <div className='textarea-wrapper'>
              <textarea
                className={`form-textarea ${isOverLimit ? 'form-textarea-error' : ''}`}
                placeholder='Provide a detailed explanation of your situation...'
                value={description}
                onChange={handleDescriptionChange}
                id='description-input'
                rows={6}
                disabled={isSubmitting || !isAccountSuspended}
              />
            </div>
          </div>

          <div className='appeals-character-count'>
            <div className='character-count-bar-container'>
              <div
                className={`character-count-bar ${isOverLimit ? 'character-count-bar-error' : ''}`}
                style={{ width: `${characterPercentage}%` }}
              />
            </div>
            <div className='character-count-text'>
              <span className={`form-hint ${isOverLimit ? 'text-error' : ''}`}>
                {characterCount} / {maxCharacters} characters
              </span>
            </div>
          </div>

          {isOverLimit && (
            <p className='form-error'>
              Your description exceeds the maximum character limit by{' '}
              {characterCount - maxCharacters} characters.
            </p>
          )}

          <div className='appeals-submit-container'>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled || !isAccountSuspended}
              className='btn btn-primary'>
              {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppealsPage;
