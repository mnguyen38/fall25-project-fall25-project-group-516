import { useState, useEffect } from 'react';
import { getCommunities } from '../services/communityService';
import { getQuestionsByFilter } from '../services/questionService';
import { DatabaseCommunity, PopulatedDatabaseQuestion } from '../types/types';

/**
 * Custom hook to fetch data for the right sidebar
 * Fetches top communities and hot questions.
 */
const useRightSidebar = () => {
  const [topCommunities, setTopCommunities] = useState<DatabaseCommunity[]>([]);
  const [hotQuestions, setHotQuestions] = useState<PopulatedDatabaseQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        setLoading(true);

        // Fetch all communities and filter to only public ones, then sort by participant count
        const communities = await getCommunities();
        const publicCommunities = communities.filter(c => c.visibility === 'PUBLIC');
        const sortedCommunities = publicCommunities
          .sort((a, b) => b.participants.length - a.participants.length)
          .slice(0, 4);
        setTopCommunities(sortedCommunities);

        // Fetch hot questions (most viewed) and filter out questions from private communities
        const questions = await getQuestionsByFilter('mostViewed', '');
        const publicQuestions = questions.filter(
          q => !q.community || q.community.visibility === 'PUBLIC',
        );
        setHotQuestions(publicQuestions.slice(0, 5));
      } catch (error) {
        // Silent error handling
        setTopCommunities([]);
        setHotQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarData();
  }, []);

  return {
    topCommunities,
    hotQuestions,
    loading,
  };
};

export default useRightSidebar;
