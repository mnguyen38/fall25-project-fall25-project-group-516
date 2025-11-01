import { Schema } from 'mongoose';

/**
 * Mongoose schema for the User collection.
 *
 * This schema defines the structure for storing users in the database.
 * Each User includes the following fields:
 * - `username`: The username of the user.
 * - `password`: The encrypted password securing the user's account.
 * - `dateJoined`: The date the user joined the platform.
 * - `biography`: User's biography text.
 * - `profilePicture`: URL/path to user's profile picture.
 * - `bannerImage`: URL/path to user's banner image.
 * - `oauthProvider`: OAuth provider used ('local', 'google', 'github').
 * - `oauthId`: ID from OAuth provider.
 * - `badges`: Array of badge IDs the user has earned.
 * - `displayedBadges`: Array of badge IDs the user wants to display.
 * - `loginStreak`: Number of consecutive days the user has logged in.
 * - `lastLogin`: The last date/time the user logged in.
 * - `showLoginStreak`: Whether to display the login streak on profile.
 */
const userSchema: Schema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      immutable: true,
    },
    password: {
      type: String,
      required: function (this: { oauthProvider: string }) {
        // Password is only required for local authentication
        return !this.oauthProvider || this.oauthProvider === 'local';
      },
    },
    dateJoined: {
      type: Date,
    },
    biography: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    oauthProvider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    oauthId: {
      type: String,
      default: null,
    },
    badges: {
      type: [Schema.Types.ObjectId],
      ref: 'Badge',
      default: [],
    },
    displayedBadges: {
      type: [Schema.Types.ObjectId],
      ref: 'Badge',
      default: [],
    },
    loginStreak: {
      type: Number,
      default: 0,
    },
    maxLoginStreak: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    showLoginStreak: {
      type: Boolean,
      default: true,
    },
    email: {
      type: String,
      unique: true,
      default: '',
    },
  },
  { collection: 'User' },
);

export default userSchema;
