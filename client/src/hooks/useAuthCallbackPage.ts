// src/hooks/useAuthCallback.ts

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useLoginContext from './useLoginContext';
import { setAuthToken } from '../utils/auth';
import { verifyStoredToken } from '../services/userService';

const useAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useLoginContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const authError = params.get('error');

      if (authError) {
        setError(authError);
        navigate('/login?error=oauth_failed');
        return;
      }

      if (token) {
        try {
          setAuthToken(token);
          const userData = await verifyStoredToken();

          if (userData) {
            setUser(userData);
            navigate('/home');
          } else {
            throw new Error('Invalid token or verification failed.');
          }
        } catch (err) {
          setError('Failed to log in with token.');
          navigate('/login?error=token_verification_failed');
        }
      } else {
        setError('No token received.');
        navigate('/login?error=unexpected');
      }

      setIsLoading(false);
    };

    handleAuth();
  }, [location, navigate, setUser]);

  return { isLoading, error };
};

export default useAuthCallback;
