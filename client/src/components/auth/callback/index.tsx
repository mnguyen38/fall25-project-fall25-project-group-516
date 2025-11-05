import useAuthCallback from '../../../hooks/useAuthCallbackPage';
import '../callback/index.css';

const AuthCallbackPage = () => {
  const { isLoading, error } = useAuthCallback();

  return (
    <div className='container'>
      {isLoading && (
        <>
          <h2>Authenticating...</h2>
          <p>Please wait while we log you in.</p>
        </>
      )}
      {error && (
        <>
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <a href='/' className='signup-link'>
            Go to Login
          </a>
        </>
      )}
    </div>
  );
};

export default AuthCallbackPage;
