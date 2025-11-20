import { useEffect, useState } from 'react';
import { getAuthToken } from '../utils/auth';
import { getLoginStatus, setLoginStatus } from '../utils/login';
import useUserContext from './useUserContext';
import { activatePremiumProfile } from '../services/userService';

/**
 * Custom hook that encapsulates all logic/state for TransactionWindow Component.
 */
const useTransactionWindow = () => {
  const { user } = useUserContext();
  const [showWindow, setShowWindow] = useState(false);
  const [cost, setCost] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [awarded, setAwarded] = useState<boolean>(false);
  const [type, setType] = useState<'login' | 'premium' | null>(null);

  // login reward
  const [loginStreak, setLoginStreak] = useState(0);

  // general
  useEffect(() => {
    if (type) {
      openTransactionWindow();
    }
  }, [type]);

  /**
   * Opens transaction window and sets various attributes depending on type of transaction
   * @param type login or premium transaction
   */
  const openTransactionWindow = () => {
    switch (type) {
      case 'login': {
        let reward: number;
        if (user.loginStreak) {
          reward = user.loginStreak % 7 == 0 ? 10 : user.loginStreak % 7;
          setLoginStreak(user.loginStreak);
        } else {
          // first time login
          reward = 5;
        }
        setCost(reward);
        setAwarded(true);
        setTitle('Login Reward');
        setDescription(
          loginStreak > 0
            ? `For logging in for ${loginStreak} days! Log back in tomorrow for ${reward + 1 == 7 ? 10 : reward + 1} coins!`
            : 'For your first time logging in!',
        );
        break;
      }
      case 'premium': {
        setCost(50);
        setAwarded(false);
        setTitle('Premium Membership Purchase');
        setDescription(
          'To purchase premium membership. \nPremium members will have their questions boosted in communities and be able to turn off ads.',
        );
        break;
      }
      default:
        return;
    }
    setType(type);
    setShowWindow(true);
  };

  /**
   * Handles transaction confirmation.
   */
  const handleConfirmation = () => {
    switch (type) {
      case 'login':
        loginClaimed();
        break;
      case 'premium':
        handleActivatePremium();
        break;
      default:
        return;
    }
  };

  // premium transaction
  /**
   * When user confirms premium transaction, updates user to have premiumProfile.
   */
  const handleActivatePremium = async () => {
    if (!user.username) return;

    try {
      await activatePremiumProfile(user.username);
      // Refresh page to activate ad-free browsing experience
      // is this supposed to log you out? Will revisit at later date
      // window.location.reload();
    } catch {
      // error is probably handled
    }
  };
  //login reward transaction
  /**
   * If it is user's first login of session, opens transaction window for login reward.
   */
  useEffect(() => {
    if (getAuthToken() && !getLoginStatus(user.username)) {
      setType('login');
      // openTransactionWindow('login');
    }
  }, [user.loginStreak, user.username]);

  /**
   * When user claims login reward, sets login status in session storage.
   * This ensures that the next time they log in during the session, they won't get a duplicate reward.
   */
  const loginClaimed = () => {
    setLoginStatus(user.username);
  };

  return {
    showWindow,
    setShowWindow,
    setType,
    cost,
    title,
    description,
    awarded,
    handleConfirmation,
    openTransactionWindow,
  };
};

export default useTransactionWindow;
