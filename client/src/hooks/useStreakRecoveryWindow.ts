import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import {
  decrementStreakPasses,
  reduceCoins,
  resetLoginStreak,
  toggleStreakHold,
} from '../services/userService';

/**
 * Custom hook that encapsulates all logic/state for StreakRecoveryWindow Component.
 */
const useStreakRecoveryWindow = () => {
  const { user } = useUserContext();
  const [showRecoveryWindow, setShowRecoveryWindow] = useState(false);
  const [hasPasses, setHasPasses] = useState(false);
  const [hasCoins, setHasCoins] = useState(false);
  const [loginStreak, setLoginStreak] = useState(1);
  const [recoveryCost, setRecoveryCost] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelStreak, setCancelStreak] = useState(true);

  /**
   * Upon log-in, if streak has been held for user sets up recoveryWindow states.
   */
  useEffect(() => {
    if (user.streakHold === true) {
      if (user.loginStreak) {
        setLoginStreak(user.loginStreak);
        if (user.streakPass && user.streakPass > 0) {
          setHasPasses(true);
        }
        if (user.missedDays) {
          const cost = user.missedDays * 10;
          if (user.coins && user.coins >= cost) {
            setHasCoins(true);
            setRecoveryCost(cost);
          }
        }
        setShowRecoveryWindow(true);
      } else {
        handleOnClose();
      }
    }
  }, [user.streakHold]);

  /**
   * If user chooses to recover their streak, pays using their chosen currency, then releases hold on streak.
   * If usePass true, use streakPass. If false spend user's coins (recoveryCost).
   * Sets cancel to false.
   */
  const handleRecoverStreak = async (usePass: boolean) => {
    try {
      setCancelStreak(false);
      // pay for streak recovery
      if (usePass) {
        await decrementStreakPasses(user.username);
      } else {
        await reduceCoins(user.username, recoveryCost);
      }
      // if payment successful, release hold
      await toggleStreakHold(user.username);
      handleOnClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * On close, if canceling transaction changes login streak to 1.
   * Resets streak recovery window states & closes window.
   */
  const handleOnClose = async () => {
    try {
      if (cancelStreak) {
        await resetLoginStreak(user.username);
      }
      await toggleStreakHold(user.username);
      setShowRecoveryWindow(false);
      setCancelStreak(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  };

  return {
    showRecoveryWindow,
    loginStreak,
    hasPasses,
    hasCoins,
    recoveryCost,
    handleRecoverStreak,
    handleOnClose,
    error,
    submitting,
  };
};

export default useStreakRecoveryWindow;
