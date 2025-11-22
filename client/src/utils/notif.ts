import { NotificationType } from '@fake-stack-overflow/shared/types/notification';
import {
  FiMessageCircle,
  FiHelpCircle,
  FiUsers,
  FiMail,
  FiAlertTriangle,
  FiCheckCircle,
  FiBell,
} from 'react-icons/fi';

// --- Icons & Colors Helpers ---
export const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'comment':
      return FiMessageCircle;
    case 'answer':
      return FiHelpCircle;
    case 'community':
      return FiUsers;
    case 'message':
      return FiMail;
    case 'report':
      return FiAlertTriangle;
    case 'unban':
      return FiCheckCircle;
    case 'sitewide':
      return FiAlertTriangle;
    default:
      return FiBell;
  }
};

export const getTypeColor = (type: NotificationType) => {
  switch (type) {
    case 'unban':
      return '#15803d';
    case 'report':
    case 'sitewide':
      return '#dc2626';
    case 'message':
      return '#3b82f6';
    default:
      return 'var(--pancake-brown-medium)';
  }
};

export const getTypeBackground = (type: NotificationType) => {
  switch (type) {
    case 'unban':
      return '#d1f4e0';
    case 'report':
    case 'sitewide':
      return '#fde8e8';
    case 'message':
      return '#dbeafe';
    default:
      return 'var(--pancake-cream)';
  }
};
