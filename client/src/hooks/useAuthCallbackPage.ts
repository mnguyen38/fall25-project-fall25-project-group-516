import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useLoginContext from './useLoginContext';
import { setAuthToken } from '../utils/auth';
import { verifyStoredToken } from '../services/userService';

const useAuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useLoginContext();

  const { token } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      if (!token) {
        setError('OAuth Failed');
        navigate('/');
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
          navigate('/');
        }
      } else {
        setError('No token received.');
        navigate('/');
      }

      setIsLoading(false);
    };

    handleAuth();
  }, [token, navigate, setUser]);

  return { isLoading, error };
};

export default useAuthCallback;
