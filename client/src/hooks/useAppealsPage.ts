import { useState, ChangeEvent, useEffect } from 'react';
import useUserContext from './useUserContext';
import { getCommunityById, sendAppeal } from '../services/communityService';
import { useNavigate, useParams } from 'react-router-dom';
import { CommunityUpdatePayload, DatabaseCommunity } from '@fake-stack-overflow/shared';

interface UseAppealsPageReturn {
  username: string;
  description: string;
  maxCharacters: number;
  characterCount: number;
  error: string | null;
  isSubmitDisabled: boolean;
  isAccountSuspended: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  handleDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: () => Promise<void>;
  handleCloseSuccess: () => void;
}

const useAppealsPage = (): UseAppealsPageReturn => {
  const { user, socket } = useUserContext();
  const { communityID } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<DatabaseCommunity | null>(null);
  const [username] = useState<string>(user.username);
  const [description, setDescription] = useState<string>('');
  const [isAccountSuspended, setIsAccountSuspended] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const maxCharacters = 250;
  const characterCount = description.length;
  const isSubmitDisabled =
    description.trim().length === 0 || description.length > maxCharacters || isSubmitting;

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setDescription(e.target.value);

    if (error) setError(null);
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitDisabled) return;
    if (!community) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await sendAppeal({
        community: community._id,
        username,
        description,
        appealDateTime: new Date(),
      });

      // Handle both direct appeal object or { message, appeal } structure
      const savedAppeal = res.appeals || res;

      if (savedAppeal) {
        setIsSuccess(true);
        setDescription('');

        // Show success message for 2 seconds then redirect
        setTimeout(() => {
          navigate('/communities');
        }, 2000);
      } else {
        // If we received a response but couldn't parse the ID, throw to trigger catch
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError('Failed to submit appeal. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccess(false);
    navigate('/communities');
  };

  const fetchIsBannedOrMuted = async (communityId: string) => {
    try {
      const community = await getCommunityById(communityId);
      setIsAccountSuspended(
        (community.muted?.includes(username) || community.banned?.includes(username)) ?? false,
      );
      setCommunity(community);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  useEffect(() => {
    if (communityID) {
      fetchIsBannedOrMuted(communityID);
    }

    const handleCommunityUpdate = (communityUpdate: CommunityUpdatePayload) => {
      if (
        communityUpdate.type === 'updated' &&
        communityUpdate.community._id.toString() === communityID
      ) {
        setIsAccountSuspended(
          (communityUpdate.community.muted?.includes(username) ||
            communityUpdate.community.banned?.includes(username)) ??
            false,
        );
        setCommunity(communityUpdate.community);
      }
    };

    socket.on('communityUpdate', handleCommunityUpdate);

    return () => {
      socket.off('communityUpdate', handleCommunityUpdate);
    };
  }, [username]);

  return {
    username,
    description,
    maxCharacters,
    characterCount,
    error,
    isSubmitDisabled,
    isAccountSuspended,
    isSubmitting,
    isSuccess,
    handleDescriptionChange,
    handleSubmit,
    handleCloseSuccess,
  };
};

export default useAppealsPage;
