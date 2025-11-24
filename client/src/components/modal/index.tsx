import React, { useEffect } from 'react';
import './index.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className={`modal-content ${className || ''}`}
        onClick={e => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : undefined}>
        <div className='modal-header'>
          <h2 className='modal-title'>{title}</h2>
          <button className='modal-close' onClick={onClose} aria-label='Close modal'>
            ×
          </button>
        </div>
        <div className='modal-body'>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
