import { Schema } from 'mongoose';

/**
 * Mongoose schema for the BanAppeal collection.
 *
 * This schema defines the structure for storing ban appeals in the database.
 * Users who are banned from a community can appeal their ban to moderators.
 * Each BanAppeal includes the following fields:
 * - `communityId`: ID of the community where the ban occurred
 * - `username`: Username of the banned user making the appeal
 * - `appealReason`: User's explanation for why the ban should be lifted
 * - `status`: Current status of the appeal (pending, approved, rejected)
 * - `createdAt`: Timestamp when the appeal was created
 * - `reviewedBy`: Moderator username who reviewed the appeal
 * - `reviewedAt`: Timestamp when the appeal was reviewed
 * - `reviewNotes`: Moderator's notes about their decision
 */
const banAppealSchema: Schema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    appealReason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { collection: 'BanAppeal' },
);

// Compound index: prevent duplicate active appeals for same user in same community
banAppealSchema.index({ communityId: 1, username: 1, status: 1 });

export default banAppealSchema;
