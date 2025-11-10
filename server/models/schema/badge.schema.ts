import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Badge collection.
 *
 * This schema defines the structure for storing badges in the database.
 * Each badge includes the following fields:
 * - `name`: The name of the badge (e.g., "First Question", "100 Upvotes").
 * - `description`: A description of what the badge represents.
 * - `icon`: URL/path to the badge icon image.
 * - `category`: Category of the badge (e.g., "participation", "achievement", "streak").
 * - `requirement`: The requirement object defining conditions to earn this badge.
 *   - `type`: Type of requirement (e.g., "question_count", "upvote_count", "login_streak").
 *   - `threshold`: Numeric threshold to meet the requirement.
 * - `hint`: Hint text to help users understand how to earn the badge.
 * - `progress`: Whether this badge tracks progress (true/false).
 */
const badgeSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['participation', 'achievement', 'streak', 'special'],
      default: 'achievement',
    },
    requirement: {
      type: {
        type: String,
        required: true,
        enum: [
          'question_count',
          'answer_count',
          'upvote_count',
          'login_streak',
          'comment_count',
          'first_question',
          'first_answer',
        ],
      },
      threshold: {
        type: Number,
        required: true,
      },
    },
    hint: {
      type: String,
      default: '',
    },
    progress: {
      type: Boolean,
      default: true,
    },
    coinValue: {
      type: Number,
      default: 5,
    },
  },
  { collection: 'Badge' },
);

export default badgeSchema;
