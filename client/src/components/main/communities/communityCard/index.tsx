import './index.css';
import { DatabaseCommunity } from '../../../../types/types';
import useCommunityCard from '../../../../hooks/useCommunityCard';
import CommunityMembershipButton from '../communityMembershipButton';

/**
 * CommunityCard component displays information about a community, including its name,
 * description, visibility, and number of participants. It also provides a button to join the community.
 */
const CommunityCard = ({
  community,
  setError,
}: {
  community: DatabaseCommunity;
  setError: (error: string | null) => void;
}) => {
  const { handleViewCommunity } = useCommunityCard(community, setError);

  return (
    <div className='community-card'>
      <h3 className='community-card-title'>{community.name}</h3>
      <p className='community-card-description'>{community.description}</p>
      <p className='community-card-meta'>
        <strong>Visibility:</strong> {community.visibility}
      </p>
      <p className='community-card-meta'>
        <strong>Members:</strong> {community.participants.length} (Premium:{' '}
        {community.premiumCount ?? 0} | Non-Premium: {community.nonPremiumCount ?? 0})
      </p>
      <div className='community-card-actions'>
        <button className='btn-action-community' onClick={handleViewCommunity}>
          View Community
        </button>
        <CommunityMembershipButton community={community} />
      </div>
    </div>
  );
};

export default CommunityCard;
