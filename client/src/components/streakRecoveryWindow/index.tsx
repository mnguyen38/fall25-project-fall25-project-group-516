import useStreakRecoveryWindow from '../../hooks/useStreakRecoveryWindow';
import Modal from '../modal';

/**
 * StreakRecoveryWindow component that renders window that allows users to recover missed streaks.
 */
const StreakRecoveryWindow = () => {
  const {
    showRecoveryWindow,
    handleOnClose,
    handleRecoverStreak,
    loginStreak,
    hasPasses,
    hasCoins,
    recoveryCost,
    error,
    submitting,
  } = useStreakRecoveryWindow();

  return (
    <Modal isOpen={showRecoveryWindow} onClose={handleOnClose} title='Recover Login Streak'>
      <div className='transaction-modal'>
        {error.length > 0 && (
          <div className='transaction-error'>
            <svg
              className='warning-icon'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
            <div>
              <h3 className='error-title'>Error recovering streak.</h3>
              <p className='error-text'>{error}</p>
            </div>
          </div>
        )}
        <div className='transaction-description'>
          <h2>{`You can recover your ${loginStreak} login streak for:`}</h2>
        </div>
        <div>
          <div className='modal-actions'>
            {hasPasses && (
              <button onClick={() => handleRecoverStreak(true)} className='button button-primary'>
                {submitting ? 'Recovering...' : '1 Streak Pass'}
              </button>
            )}
            {hasCoins && (
              <button onClick={() => handleRecoverStreak(false)} className='button button-primary'>
                {submitting ? 'Recovering...' : `${recoveryCost} Coins`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StreakRecoveryWindow;
