import { Badge, DatabaseBadge, BadgeWithProgress } from '../types/types';
import BadgeModel from '../models/badges.model';
import UserModel from '../models/users.model';
import QuestionModel from '../models/questions.model';
import AnswerModel from '../models/answers.model';
import CommentModel from '../models/comments.model';
import { ObjectId } from 'mongodb';

/**
 * Creates a new badge in the database.
 *
 * @param {Badge} badge - The badge to create
 * @returns {Promise<DatabaseBadge | null>} - The created badge, or null if error
 */
export const createBadge = async (badge: Badge): Promise<DatabaseBadge | null> => {
  try {
    const existingBadge = await BadgeModel.findOne({ name: badge.name });
    if (existingBadge) {
      return existingBadge;
    }
    const savedBadge: DatabaseBadge = await BadgeModel.create(badge);
    return savedBadge;
  } catch (error) {
    return null;
  }
};

/**
 * Gets all badges from the database.
 *
 * @returns {Promise<DatabaseBadge[]>} - Array of all badges
 */
export const getAllBadges = async (): Promise<DatabaseBadge[]> => {
  try {
    const badges = await BadgeModel.find();
    return badges;
  } catch (error) {
    return [];
  }
};

/**
 * Gets a badge by its ID.
 *
 * @param {string} badgeId - The badge ID
 * @returns {Promise<DatabaseBadge | null>} - The badge or null
 */
export const getBadgeById = async (badgeId: string): Promise<DatabaseBadge | null> => {
  try {
    const badge = await BadgeModel.findById(badgeId);
    return badge;
  } catch (error) {
    return null;
  }
};

/**
 * Calculates user progress for a specific badge requirement.
 *
 * @param {string} username - The username
 * @param {DatabaseBadge} badge - The badge to check progress for
 * @returns {Promise<number>} - The user's progress value
 */
export const calculateBadgeProgress = async (
  username: string,
  badge: DatabaseBadge,
): Promise<number> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) return 0;

    switch (badge.requirement.type) {
      case 'question_count': {
        const count = await QuestionModel.countDocuments({ askedBy: username });
        return count;
      }
      case 'answer_count': {
        const count = await AnswerModel.countDocuments({ ansBy: username });
        return count;
      }
      case 'comment_count': {
        const count = await CommentModel.countDocuments({ commentedBy: username });
        return count;
      }
      case 'login_streak': {
        // Use max streak so badge isn't lost when streak breaks
        return user.maxLoginStreak || 0;
      }
      case 'upvote_count': {
        // Count total upvotes on user's questions (answers don't have upvotes in current schema)
        const questions = await QuestionModel.find({ askedBy: username });
        const totalUpvotes = questions.reduce((sum, q) => sum + (q.upVotes?.length || 0), 0);
        return totalUpvotes;
      }
      case 'first_question': {
        const count = await QuestionModel.countDocuments({ askedBy: username });
        return count > 0 ? 1 : 0;
      }
      case 'first_answer': {
        const count = await AnswerModel.countDocuments({ ansBy: username });
        return count > 0 ? 1 : 0;
      }
      default:
        return 0;
    }
  } catch (error) {
    return 0;
  }
};

/**
 * Gets all badges for a user with their progress.
 *
 * @param {string} username - The username
 * @returns {Promise<BadgeWithProgress[]>} - Array of badges with progress
 */
export const getUserBadgesWithProgress = async (username: string): Promise<BadgeWithProgress[]> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) return [];

    const allBadges = await getAllBadges();
    const userBadgeIds = (user.badges || []).map(id => id.toString());

    const badgesWithProgress: BadgeWithProgress[] = await Promise.all(
      allBadges.map(async badge => {
        const progress = await calculateBadgeProgress(username, badge);
        const earned = userBadgeIds.includes(badge._id.toString());

        return {
          _id: badge._id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          requirement: badge.requirement,
          hint: badge.hint,
          progress: badge.progress,
          coinValue: badge.coinValue,
          userProgress: progress,
          earned,
        };
      }),
    );

    return badgesWithProgress;
  } catch (error) {
    return [];
  }
};

/**
 * Checks and awards badges to a user based on their activity.
 *
 * @param {string} username - The username
 * @returns {Promise<DatabaseBadge[]>} - Array of newly earned badges
 */
export const checkAndAwardBadges = async (username: string): Promise<DatabaseBadge[]> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) return [];

    const allBadges = await getAllBadges();
    const userBadgeIds = (user.badges || []).map(id => id.toString());
    const newlyEarnedBadges: DatabaseBadge[] = [];

    for (const badge of allBadges) {
      // Skip if user already has this badge
      if (userBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      const progress = await calculateBadgeProgress(username, badge);

      // Check if requirement is met
      if (progress >= badge.requirement.threshold) {
        await UserModel.updateOne(
          { username },
          { $addToSet: { badges: badge._id } }, // $addToSet prevents duplicates
        );
        newlyEarnedBadges.push(badge);
      }
    }

    return newlyEarnedBadges;
  } catch (error) {
    throw new Error('Failed to check and award badges');
  }
};

/**
 * Updates which badges a user wants to display on their profile.
 *
 * @param {string} username - The username
 * @param {string[]} badgeIds - Array of badge IDs to display
 * @returns {Promise<boolean>} - Success status
 */
export const updateDisplayedBadges = async (
  username: string,
  badgeIds: string[],
): Promise<boolean> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) return false;

    const userBadgeIds = (user.badges || []).map(id => id.toString());

    // Verify all badge IDs belong to the user
    const validBadgeIds = badgeIds.filter(id => userBadgeIds.includes(id));

    await UserModel.updateOne(
      { username },
      { displayedBadges: validBadgeIds.map(id => new ObjectId(id)) },
    );

    return true;
  } catch (error) {
    return false;
  }
};
