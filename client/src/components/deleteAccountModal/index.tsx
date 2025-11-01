import React, { useState } from 'react';
import Modal from '../modal';
import './index.css';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  username: string;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  username,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm();
      setConfirmText('');
      onClose();
    } catch (err) {
      // Error handling is done in the parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const isConfirmDisabled = confirmText !== username || submitting;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Delete Account' maxWidth='450px'>
      <div className='delete-account-modal'>
        <div className='danger-warning'>
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
            <h3 className='danger-title'>This action cannot be undone</h3>
            <p className='danger-text'>
              Deleting your account will permanently remove all your data, including questions,
              answers, comments, and profile information.
            </p>
          </div>
        </div>

        <div className='form-group'>
          <label htmlFor='confirm-username'>
            Type <strong>{username}</strong> to confirm:
          </label>
          <input
            id='confirm-username'
            type='text'
            className='input-text'
            placeholder={username}
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            disabled={submitting}
            autoComplete='off'
          />
        </div>

        <div className='modal-actions'>
          <button className='button button-secondary' onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className='button button-danger'
            onClick={handleConfirm}
            disabled={isConfirmDisabled}>
            {submitting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAccountModal;
