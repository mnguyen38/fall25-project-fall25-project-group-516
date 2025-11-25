import { useCallback, useEffect, useState } from 'react';
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
  const [showRecoveryWindow, setShowRecoveryWindow] = useState<boolean>(false);
  const [hasPasses, setHasPasses] = useState<boolean>(false);
  const [hasCoins, setHasCoins] = useState<boolean>(false);
  const [loginStreak, setLoginStreak] = useState(1);
  const [recoveryCost, setRecoveryCost] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cancelStreak, setCancelStreak] = useState<boolean>(false);

  /**
   * On close without recovery, resets streak to 1 and closes window.
   */
  const handleOnClose = useCallback(async () => {
    try {
      // Decline recovery - reset streak to 1
      await resetLoginStreak(user.username);
      await toggleStreakHold(user.username);
      setShowRecoveryWindow(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, [user.username]);

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
  }, [
    user.streakHold,
    user.loginStreak,
    user.streakPass,
    user.missedDays,
    user.coins,
    handleOnClose,
  ]);

  /**
   * If user chooses to recover their streak, pays using their chosen currency, then releases hold on streak.
   * If usePass true, use streakPass. If false spend user's coins (recoveryCost).
   * Sets cancel to false.
   */
  const handleRecoverStreak = async (usePass: boolean) => {
    try {
      setSubmitting(true);
      // pay for streak recovery
      if (usePass) {
        await decrementStreakPasses(user.username);
      } else {
        await reduceCoins(user.username, recoveryCost);
      }
      // Accept recovery - release hold and close
      await toggleStreakHold(user.username);
      setShowRecoveryWindow(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * If streak is set to be canceled then it does, if not nothing happens/ streak is retained
   */
  useEffect(() => {
    const cancelHeldStreak = async () => {
      try {
        if (cancelStreak) {
          await resetLoginStreak(user.username);
          setCancelStreak(!cancelStreak);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
      }
    };

    cancelHeldStreak();
  }, [cancelStreak, user.username]);

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
    setCancelStreak,
  };
};

export default useStreakRecoveryWindow;
