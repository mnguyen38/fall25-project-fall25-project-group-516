import { ChangeEvent, useState, KeyboardEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useLoginContext from './useLoginContext';
import { removeAuthToken } from '../services/userService';
import useUserContext from './useUserContext';
import { TransactionEventPayload } from '@fake-stack-overflow/shared';

/**
 * Custom hook to manage the state and logic for a header input field.
 * It supports handling input changes, executing a search on 'Enter' key press,
 * and managing user sign-out functionality.
 *
 * @returns {Object} An object containing:
 *   - val: The current value of the input field.
 *   - setVal: Function to update the input field value.
 *   - handleInputChange: Function to handle changes in the input field.
 *   - handleKeyDown: Function to handle 'Enter' key press and trigger a search.
 *   - handleSignOut: Function to handle user sign-out and navigation to the landing page.
 */
const useHeader = () => {
  const navigate = useNavigate();
  const { setUser } = useLoginContext();
  const { user, socket } = useUserContext();

  const [val, setVal] = useState<string>('');
  const [coins, setCoins] = useState<number>(0);

  /**
   * Updates the state value when the input field value changes.
   *
   * @param e - The input change event.
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
  };

  /**
   * Handles the 'Enter' key press event to perform a search action.
   * Constructs a search query and navigates to the search results page.
   *
   * @param e - The keyboard event object.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const searchParams = new URLSearchParams();
      searchParams.set('search', e.currentTarget.value);

      navigate(`/home?${searchParams.toString()}`);
    }
  };

  useEffect(() => {
    /**
     * Sets coin display based on user's current amount of coins.
     */
    const fetchCurrentCoins = () => {
      if (user.coins) {
        setCoins(user.coins);
      } else {
        setCoins(0);
      }
    };

    const handleCoinUpdate = async (payload: TransactionEventPayload) => {
      if (payload.username == user.username) {
        setCoins(payload.amount);
      }
    };

    fetchCurrentCoins();

    socket.on('transactionEvent', handleCoinUpdate);

    return () => {
      socket.off('transactionEvent', handleCoinUpdate);
    };
  }, [socket, user.coins, user.username]);

  /**
   * Signs the user out by clearing the user context, removing the auth token, and navigating to the landing page.
   */
  const handleSignOut = () => {
    setUser(null);
    removeAuthToken();
    navigate('/');
  };

  return {
    val,
    setVal,
    handleInputChange,
    handleKeyDown,
    handleSignOut,
    coins,
    user,
  };
};

export default useHeader;
