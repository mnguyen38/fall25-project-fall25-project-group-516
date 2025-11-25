import { useCallback, useEffect, useState } from 'react';
import { getAuthToken } from '../utils/auth';
import { getLoginStatus, setLoginStatus } from '../utils/login';
import useUserContext from './useUserContext';

/**
 * Custom hook that encapsulates most of the logic/state for TransactionWindow Component.
 */
const useTransactionWindow = () => {
  const { user } = useUserContext();
  const [showRewardWindow, setShowRewardWindow] = useState(false);
  const [reward, setReward] = useState<number>(0);
  const [rewardDescription, setRewardDescription] = useState<string>('');

  // login reward
  const [loginStreak, setLoginStreak] = useState(0);

  /**
   * Opens transaction window and sets various attributes depending on type of transaction
   * @param type login or premium transaction
   */
  const openTransactionWindow = useCallback(() => {
    let reward: number;
    if (user.loginStreak) {
      reward = user.loginStreak % 7 == 0 ? 10 : user.loginStreak % 7;
      setLoginStreak(user.loginStreak);
    } else {
      // first time login
      reward = 5;
    }
    setReward(reward);
    setRewardDescription(
      loginStreak > 0
        ? `For logging in for ${loginStreak} days! Log back in tomorrow for ${reward + 1 == 7 ? 10 : reward + 1} coins!`
        : 'For your first time logging in!',
    );
    setShowRewardWindow(true);
    // eslint-disable-next-line no-console
    console.log(showRewardWindow);
  }, [user.loginStreak, loginStreak, showRewardWindow]);

  /**
   * Handles transaction confirmation.
   */
  const handleRewardConfirmation = () => {
    loginClaimed();
  };

  //login reward transaction
  /**
   * If it is user's first login of session, opens transaction window for login reward.
   */
  useEffect(() => {
    if (user.streakHold === true) return;
    if (getAuthToken() && !getLoginStatus(user.username)) {
      openTransactionWindow();
    }
  }, [user.loginStreak, user.username, user.streakHold, openTransactionWindow]);

  /**
   * When user claims login reward, sets login status in session storage.
   * This ensures that the next time they log in during the session, they won't get a duplicate reward.
   */
  const loginClaimed = () => {
    setLoginStatus(user.username);
  };

  return {
    showRewardWindow,
    setShowRewardWindow,
    reward,
    rewardDescription,
    handleRewardConfirmation,
    openTransactionWindow,
  };
};

export default useTransactionWindow;
