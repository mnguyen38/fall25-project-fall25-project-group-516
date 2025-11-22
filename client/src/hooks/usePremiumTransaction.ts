import { useState } from 'react';
import useUserContext from './useUserContext';
import { activatePremiumProfile } from '../services/userService';

/**
 * Custom hook that encapsulates all logic/state for TransactionWindow Component.
 */
const usePremiumTransaction = () => {
  const { user } = useUserContext();
  const [showPremiumWindow, setShowPremiumWindow] = useState(false);
  const [cost, setCost] = useState<number>(0);

  /**
   * Opens transaction window and sets various attributes depending on type of transaction
   * @param type login or premium transaction
   */
  const openTransactionWindow = () => {
    setCost(50);
    setShowPremiumWindow(true);
    // eslint-disable-next-line no-console
    console.log(showPremiumWindow);
  };

  /**
   * Handles transaction confirmation.
   */
  const handlePremiumConfirmation = () => {
    handleActivatePremium();
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
    } catch (error) {
      throw Error('Activating premium profile failed');
    }
  };

  return {
    showPremiumWindow,
    setShowPremiumWindow,
    cost,
    handlePremiumConfirmation,
    openTransactionWindow,
  };
};

export default usePremiumTransaction;
