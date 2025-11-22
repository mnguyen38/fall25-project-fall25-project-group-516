import { JSX, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout';
import Login from './auth/login';
import { FakeSOSocket, SafeDatabaseUser } from '../types/types';
import LoginContext from '../contexts/LoginContext';
import UserContext from '../contexts/UserContext';
import { verifyStoredToken } from '../services/userService';
import QuestionPage from './main/questionPage';
import TagPage from './main/tagPage';
import NewQuestionPage from './main/newQuestion';
import NewAnswerPage from './main/newAnswer';
import AnswerPage from './main/answerPage';
import MessagingPage from './main/messagingPage';
import DirectMessage from './main/directMessage';
import Signup from './auth/signup';
import UsersListPage from './main/usersListPage';
import ProfileSettings from './profileSettings';
import AllGamesPage from './main/games/allGamesPage';
import GamePage from './main/games/gamePage';
import AllCommunitiesPage from './main/communities/allCommunitiesPage';
import NewCommunityPage from './main/communities/newCommunityPage';
import CommunityPage from './main/communities/communityPage';
import AllCollectionsPage from './main/collections/allCollectionsPage';
import CollectionPage from './main/collections/collectionPage';
import NewCollectionPage from './main/collections/newCollectionPage';
import AuthCallbackPage from './auth/callback';
import Notifications from './notificationsPage';

const ProtectedRoute = ({
  user,
  socket,
  children,
}: {
  user: SafeDatabaseUser | null;
  socket: FakeSOSocket | null;
  children: JSX.Element;
}) => {
  if (!user || !socket) {
    return <Navigate to='/' />;
  }

  return <UserContext.Provider value={{ user, socket }}>{children}</UserContext.Provider>;
};

/**
 * Represents the main component of the application.
 * It manages the state for search terms and the main title.
 */
const FakeStackOverflow = ({ socket }: { socket: FakeSOSocket | null }) => {
  const [user, setUser] = useState<SafeDatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on mount and auto-login if valid
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await verifyStoredToken();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        // console.error('Error verifying token:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <LoginContext.Provider value={{ setUser }}>
      <Routes>
        {/* Public Routes - redirect to /home if already logged in */}
        <Route path='/' element={user ? <Navigate to='/home' /> : <Login />} />
        <Route path='/signup' element={user ? <Navigate to='/home' /> : <Signup />} />
        <Route
          path='/auth/callback/:token'
          element={user ? <Navigate to='/home' /> : <AuthCallbackPage />}
        />
        {/* Protected Routes */}
        {
          <Route
            element={
              <ProtectedRoute user={user} socket={socket}>
                <Layout />
              </ProtectedRoute>
            }>
            <Route path='/home' element={<QuestionPage />} />
            <Route path='tags' element={<TagPage />} />
            <Route path='/messaging' element={<MessagingPage />} />
            <Route path='/messaging/direct-message' element={<DirectMessage />} />
            <Route path='/question/:qid' element={<AnswerPage />} />
            <Route path='/new/question' element={<NewQuestionPage />} />
            <Route path='/new/answer/:qid' element={<NewAnswerPage />} />
            <Route path='/users' element={<UsersListPage />} />
            <Route path='/user/:username' element={<ProfileSettings />} />
            <Route path='/new/collection' element={<NewCollectionPage />} />
            <Route path='/collections/:username' element={<AllCollectionsPage />} />
            <Route path='/collections/:username/:collectionId' element={<CollectionPage />} />
            <Route path='/games' element={<AllGamesPage />} />
            <Route path='/games/:gameID' element={<GamePage />} />
            <Route path='/communities' element={<AllCommunitiesPage />} />
            <Route path='/new/community' element={<NewCommunityPage />} />
            <Route path='/communities/:communityID' element={<CommunityPage />} />
            <Route path='/notifications' element={<Notifications />} />
          </Route>
        }
      </Routes>
    </LoginContext.Provider>
  );
};

export default FakeStackOverflow;
