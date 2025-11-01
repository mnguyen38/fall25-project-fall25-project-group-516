import React, { useState } from 'react';
import Modal from '../modal';
import './index.css';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Reset Password' maxWidth='400px'>
      <div className='reset-password-modal'>
        <p className='modal-description'>Enter your new password below.</p>

        {error && <div className='modal-error'>{error}</div>}

        <div className='form-group'>
          <label htmlFor='new-password'>New Password</label>
          <input
            id='new-password'
            type={showPassword ? 'text' : 'password'}
            className='input-text'
            placeholder='Enter new password'
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='confirm-password'>Confirm Password</label>
          <input
            id='confirm-password'
            type={showPassword ? 'text' : 'password'}
            className='input-text'
            placeholder='Confirm new password'
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className='form-group'>
          <label className='checkbox-label'>
            <input
              type='checkbox'
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
              disabled={submitting}
            />
            <span>Show passwords</span>
          </label>
        </div>

        <div className='modal-actions'>
          <button className='button button-secondary' onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className='button button-primary'
            onClick={handleSubmit}
            disabled={submitting || !newPassword || !confirmPassword}>
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
