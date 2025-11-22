import { useState } from 'react';
import { createReport } from '../../../../services/reportService';
import './index.css';

interface ReportUserModalProps {
  communityId: string;
  reportedUsername: string;
  reporterUsername: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'misleading', label: 'Misleading Information' },
  { value: 'other', label: 'Other' },
] as const;

const ReportUserModal = ({
  communityId,
  reportedUsername,
  reporterUsername,
  onClose,
  onSuccess,
}: ReportUserModalProps) => {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<
    'spam' | 'harassment' | 'inappropriate' | 'misleading' | 'other'
  >('spam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReport({
        communityId,
        reportedUser: reportedUsername,
        reporterUser: reporterUsername,
        reason: reason.trim(),
        category,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content report-modal-content' onClick={handleContentClick}>
        {/* Header */}
        <div className='modal-header'>
          <h3 className='modal-title'>Report User: {reportedUsername}</h3>
          <button className='modal-close-btn' onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className='modal-body'>
          {success ? (
            <div className='success-message'>
              <div className='success-icon'>✓</div>
              <div className='success-text'>Report submitted successfully</div>
            </div>
          ) : (
            <>
              {/* Category Selection */}
              <div className='form-group'>
                <label htmlFor='category' className='form-label'>
                  Category
                </label>
                <select
                  id='category'
                  className='form-select'
                  value={category}
                  onChange={e => setCategory(e.target.value as typeof category)}
                  disabled={isSubmitting}>
                  {REPORT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason Textarea */}
              <div className='form-group'>
                <label htmlFor='reason' className='form-label'>
                  Reason <span className='required'>*</span>
                </label>
                <textarea
                  id='reason'
                  className='form-textarea'
                  placeholder='Please explain why you are reporting this user...'
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  maxLength={500}
                  rows={6}
                  disabled={isSubmitting}
                  autoFocus
                />
                <div className='character-count'>{reason.length} / 500</div>
              </div>

              {/* Error Message */}
              {error && (
                <div className='error-message'>
                  <span className='error-icon'>⚠️</span>
                  <span className='error-text'>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className='modal-actions'>
                <button
                  className='btn btn-cancel'
                  onClick={onClose}
                  disabled={isSubmitting}
                  type='button'>
                  Cancel
                </button>
                <button
                  className='btn btn-submit'
                  onClick={handleSubmit}
                  disabled={isSubmitting || !reason.trim()}
                  type='button'>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportUserModal;
